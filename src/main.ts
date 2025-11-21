import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as client from 'prom-client';
import { Client } from 'pg';
import { AlarmsService } from './alarms/alarms.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Smart Water Monitoring System')
    .setDescription('NestJS Application')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  app.enableCors();

  // -----------------------------------------
  // ✅ PROMETHEUS METRICS ENDPOINT
  // -----------------------------------------
  client.collectDefaultMetrics();

  // Get underlying Express instance
  const server = app.getHttpAdapter().getInstance();

  server.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  console.log('Prometheus metrics available at /metrics');

  // -----------------------------------------
  // ✅ POSTGRESQL NOTIFICATION LISTENER
  // -----------------------------------------
  const pgClient = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });

  try {
    await pgClient.connect();
    console.log('✅ PostgreSQL notification listener connected');

    // Get AlarmsService from the app context
    const alarmsService = app.get(AlarmsService);

    // Listen for notifications
    pgClient.on('notification', async (msg) => {
      if (msg.channel === 'new_sensor_reading') {
        console.log('🔔 New sensor reading notification received');
        try {
          const data = JSON.parse(msg.payload);
          console.log('📊 Processing alarm data:', data);
          await alarmsService.processNewAlarm(data);
        } catch (error) {
          console.error('❌ Error processing notification:', error);
        }
      }
    });

    // Subscribe to the channel
    await pgClient.query('LISTEN new_sensor_reading');
    console.log('👂 Listening for new_sensor_reading notifications');

    // Handle connection errors
    pgClient.on('error', (err) => {
      console.error('❌ PostgreSQL listener error:', err);
      // Attempt to reconnect
      setTimeout(async () => {
        try {
          await pgClient.connect();
          await pgClient.query('LISTEN new_sensor_reading');
          console.log('🔄 Reconnected to PostgreSQL listener');
        } catch (reconnectError) {
          console.error('❌ Failed to reconnect:', reconnectError);
        }
      }, 5000);
    });

    // Add health check endpoint
    server.get('/health/postgres-listener', async (req, res) => {
      const isConnected = pgClient && !pgClient.ended;
      res.json({
        status: isConnected ? 'connected' : 'disconnected',
        listening: isConnected ? ['new_sensor_reading'] : [],
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error(
      '❌ Failed to setup PostgreSQL notification listener:',
      error,
    );
    // Don't fail the app if listener setup fails
  }

  // -----------------------------------------
  // START SERVER
  // -----------------------------------------
  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Application running on environment: ${process.env.NODE_ENV} 🚀`);
  console.log(`Application running on port: ${process.env.PORT || 3000} 🚀`);
}

bootstrap();

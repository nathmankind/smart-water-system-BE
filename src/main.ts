import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as client from 'prom-client';

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

  // -----------------------------------------  // await app.listen(process.env.PORT ?? 3001);
  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on app get: ${await app.getUrl()}`);
  console.log(`Application running on environment ${process.env.NODE_ENV} 🚀`);
  console.log(`Application running on ${process.env.PORT || 3001} 🚀`);
  console.log(`This is the port from env: ${process.env.PORT}`);
}
bootstrap();

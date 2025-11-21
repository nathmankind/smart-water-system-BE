import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Location } from '../locations/entities/location.entity';

// Load environment variables
config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
  //   ssl: {
  //     rejectUnauthorized: false,
  //   },
  logging: true,
});

// import { DataSource, DataSourceOptions } from 'typeorm';
// import { ConfigService } from '@nestjs/config';
// import { config } from 'dotenv';

// config(); // Load .env file

// const configService = new ConfigService();

// export const typeOrmConfig: DataSourceOptions = {
//   type: 'postgres',
//   host: configService.get('DB_HOST') || 'localhost',
//   port: parseInt(configService.get('DB_PORT') as string, 10) || 5432,
//   username: configService.get('DB_USERNAME'),
//   password: configService.get('DB_PASSWORD'),
//   database: configService.get('DB_NAME'),
//   entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//   migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//   synchronize: false,
//   logging: true,
// };

// export const dataSource = new DataSource(typeOrmConfig);
// export default dataSource;

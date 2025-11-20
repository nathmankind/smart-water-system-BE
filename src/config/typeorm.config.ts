import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Location } from '../locations/entities/location.entity';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Company, Location],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  //   ssl:
  // process.env.NODE_ENV === 'production'
  //   ? {
  //       rejectUnauthorized: false,
  //     }
  //   : false,
  ssl: {
    rejectUnauthorized: false,
  },
});

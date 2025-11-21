import { dataSource } from 'src/config/typeorm.config';
import { DataSource } from 'typeorm';

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    await dataSource.runMigrations();
    console.log('Migrations have been executed successfully!');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error during migration run:', error);
    process.exit(1);
  }
}

runMigrations();

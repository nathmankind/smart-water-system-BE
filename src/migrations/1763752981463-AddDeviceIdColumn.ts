import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceIdColumn1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user__user_location"
            ADD COLUMN "device_id" VARCHAR;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user__user_location"
            DROP COLUMN "device_id";
        `);
  }
}

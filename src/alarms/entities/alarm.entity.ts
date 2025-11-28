// @Entity('sensor_readings', { synchronize: false })
// export class Alarm {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column({ name: 'device_name' })
//   deviceName: string;

//   @Column({ type: 'decimal', precision: 10, scale: 2 })
//   voltage: number;

//   @Column()
//   turbidity: number;

//   @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
//   ph: number;

//   @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
//   temperature: number;

//   @Column()
//   condition: string;

//   @Column({ type: 'timestamp' })
//   timestamp: Date;
// }

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum AlarmSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  NORMAL = 'normal',
  INFO = 'info',
}

export enum AlarmType {
  PH = 'ph',
  TURBIDITY = 'turbidity',
  WATER_QUALITY = 'water_quality',
  SYSTEM = 'system',
}

@Entity('sensor_readings')
export class Alarm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_name' })
  deviceName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  ph: number;

  @Column({ name: 'ph_status', type: 'varchar' })
  phStatus: string;

  @Column({ name: 'turbidity_ntu' })
  turbidityNtu: number;

  @Column({ name: 'turbidity_status', type: 'varchar' })
  turbidityStatus: string;

  @Column({ name: 'water_quality', type: 'varchar', nullable: true })
  waterQuality: string;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}

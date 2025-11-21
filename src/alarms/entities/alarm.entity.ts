import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum AlarmSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export enum AlarmType {
  TURBIDITY = 'turbidity',
  PH = 'ph',
  TEMPERATURE = 'temperature',
  VOLTAGE = 'voltage',
  CONDITION = 'condition',
}

@Entity('sensor_readings')
export class Alarm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_name' })
  deviceName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  voltage: number;

  @Column()
  turbidity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ph: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature: number;

  @Column()
  condition: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;
}

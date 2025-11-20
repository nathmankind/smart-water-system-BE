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
  VOLTAGE = 'voltage',
  CONDITION = 'condition',
}

@Entity('sensor_data')
export class Alarm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_name' })
  deviceName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  voltage: number;

  @Column()
  turbidity: number;

  @Column()
  condition: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;
}

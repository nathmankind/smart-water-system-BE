import { AlarmSeverity, AlarmType } from '../entities/alarm.entity';

export class AlarmResponseDto {
  id: number;
  deviceName: string;
  voltage: number;
  turbidity: number;
  condition: string;
  timestamp: Date;
  severity: AlarmSeverity;
  alarmType: AlarmType[];
  message: string;
}

export class AlarmQueryDto {
  deviceId?: string;
  severity?: AlarmSeverity;
  type?: AlarmType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

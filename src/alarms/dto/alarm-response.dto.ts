import { AlarmSeverity, AlarmType } from '../entities/alarm.entity';

export class AlarmResponseDto {
  id: number;
  deviceName: string;
  ph: number;
  phStatus: string;
  turbidityNtu: number;
  turbidityStatus: string;
  waterQuality: string;
  explanation: string;
  createdAt: Date;
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

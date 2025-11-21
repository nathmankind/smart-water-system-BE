import { AlarmResponseDto } from '../../alarms/dto/alarm-response.dto';

export class LocationContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export class CurrentReadings {
  turbidity: number;
  ph: number;
  temperature: number;
  voltage: number;
  condition: string;
  timestamp: Date;
}

export class AlarmSummary {
  total: number;
  critical: number;
  warning: number;
  activeAlarms: AlarmResponseDto[];
  latestReading: CurrentReadings;
}

export class LocationDetailsDto {
  id: string;
  name: string;
  deviceId: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  contactInfo: {
    email: string;
    phone: string;
  };
  company: {
    id: string;
    name: string;
  };
  locationContact: LocationContactInfo;
  alarmSummary: AlarmSummary;
  createdAt: Date;
  updatedAt: Date;
}

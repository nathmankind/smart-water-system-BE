import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Alarm, AlarmSeverity, AlarmType } from './entities/alarm.entity';
import { AlarmResponseDto, AlarmQueryDto } from './dto/alarm-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { LocationsService } from '../locations/locations.service';
import { Location } from 'src/locations/entities/location.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AlarmsService {
  // Threshold configuration
  private readonly THRESHOLDS = {
    turbidity: {
      critical: 200,
      warning: 150,
    },
    voltage: {
      critical: { min: 0, max: 1.5 },
      warning: { min: 1.5, max: 2.0 },
    },
    ph: {
      critical: { min: 0, max: 6.0, maxHigh: 8.5 },
      warning: { min: 6.0, max: 6.5, maxHigh: 8.0 },
    },
    temperature: {
      critical: { min: 0, max: 35 },
      warning: { min: 5, max: 30 },
    },
  };

  constructor(
    @InjectRepository(Alarm)
    private alarmsRepository: Repository<Alarm>,
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    private locationsService: LocationsService,
    private mailService: MailService,
  ) {}

  /**
   * Determine alarm severity based on sensor values
   */
  private determineSeverity(alarm: Alarm): AlarmSeverity {
    const criticalConditions = [
      alarm.turbidity >= this.THRESHOLDS.turbidity.critical,
      alarm.voltage <= this.THRESHOLDS.voltage.critical.max,
      alarm.condition === 'NO INPUT',
      alarm.ph &&
        (alarm.ph < this.THRESHOLDS.ph.critical.min ||
          alarm.ph > this.THRESHOLDS.ph.critical.maxHigh),
      alarm.temperature &&
        (alarm.temperature < this.THRESHOLDS.temperature.critical.min ||
          alarm.temperature > this.THRESHOLDS.temperature.critical.max),
    ];

    const warningConditions = [
      alarm.turbidity >= this.THRESHOLDS.turbidity.warning &&
        alarm.turbidity < this.THRESHOLDS.turbidity.critical,
      alarm.voltage > this.THRESHOLDS.voltage.critical.max &&
        alarm.voltage <= this.THRESHOLDS.voltage.warning.max,
      alarm.ph &&
        (alarm.ph < this.THRESHOLDS.ph.warning.min ||
          alarm.ph > this.THRESHOLDS.ph.warning.maxHigh),
      alarm.temperature &&
        (alarm.temperature < this.THRESHOLDS.temperature.warning.min ||
          alarm.temperature > this.THRESHOLDS.temperature.warning.max),
    ];

    if (criticalConditions.some((condition) => condition)) {
      return AlarmSeverity.CRITICAL;
    } else if (warningConditions.some((condition) => condition)) {
      return AlarmSeverity.WARNING;
    }

    return AlarmSeverity.INFO;
  }

  /**
   * Determine alarm types based on thresholds
   */
  private determineAlarmTypes(alarm: Alarm): AlarmType[] {
    const types: AlarmType[] = [];

    if (alarm.turbidity >= this.THRESHOLDS.turbidity.warning) {
      types.push(AlarmType.TURBIDITY);
    }

    if (alarm.voltage <= this.THRESHOLDS.voltage.warning.max) {
      types.push(AlarmType.VOLTAGE);
    }

    if (
      alarm.ph &&
      (alarm.ph < this.THRESHOLDS.ph.warning.min ||
        alarm.ph > this.THRESHOLDS.ph.warning.maxHigh)
    ) {
      types.push(AlarmType.PH);
    }

    if (
      alarm.temperature &&
      (alarm.temperature < this.THRESHOLDS.temperature.warning.min ||
        alarm.temperature > this.THRESHOLDS.temperature.warning.max)
    ) {
      types.push(AlarmType.TEMPERATURE);
    }

    if (alarm.condition !== 'CLEAN') {
      types.push(AlarmType.CONDITION);
    }

    return types.length > 0 ? types : [AlarmType.CONDITION];
  }

  /**
   * Generate human-readable message
   */
  private generateMessage(
    alarm: Alarm,
    severity: AlarmSeverity,
    types: AlarmType[],
  ): string {
    const messages: string[] = [];

    if (types.includes(AlarmType.TURBIDITY)) {
      messages.push(`High turbidity: ${alarm.turbidity} NTU`);
    }

    if (types.includes(AlarmType.VOLTAGE)) {
      messages.push(`Low voltage: ${alarm.voltage}V`);
    }

    if (types.includes(AlarmType.PH) && alarm.ph) {
      messages.push(`pH out of range: ${alarm.ph}`);
    }

    if (types.includes(AlarmType.TEMPERATURE) && alarm.temperature) {
      messages.push(`Temperature out of range: ${alarm.temperature}°C`);
    }

    if (types.includes(AlarmType.CONDITION)) {
      messages.push(`Condition: ${alarm.condition}`);
    }

    const prefix =
      severity === AlarmSeverity.CRITICAL
        ? '🔴 CRITICAL'
        : severity === AlarmSeverity.WARNING
          ? '⚠️ WARNING'
          : 'ℹ️ INFO';

    return `${prefix} - ${messages.join(', ')}`;
  }

  /**
   * Transform alarm data to response DTO
   */
  private transformToDto(alarm: Alarm): AlarmResponseDto {
    const severity = this.determineSeverity(alarm);
    const alarmType = this.determineAlarmTypes(alarm);
    const message = this.generateMessage(alarm, severity, alarmType);

    return {
      id: alarm.id,
      deviceName: alarm.deviceName,
      voltage: Number(alarm.voltage),
      turbidity: alarm.turbidity,
      ph: alarm.ph ? Number(alarm.ph) : undefined,
      temperature: alarm.temperature ? Number(alarm.temperature) : undefined,
      condition: alarm.condition,
      timestamp: alarm.timestamp,
      severity,
      alarmType,
      message,
    };
  }

  /**
   * Get accessible device IDs for a user
   */
  private async getAccessibleDeviceIds(currentUser: User): Promise<string[]> {
    let locations: Location[] = [];

    if (currentUser.role === UserRole.SUPERADMIN) {
      // Superadmin can see all locations
      locations = await this.locationsService.findAll(currentUser);
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // Company admin can see their company's locations
      locations = await this.locationsService.findByCompany(
        currentUser.companyId,
      );
    } else if (currentUser.role === UserRole.LOCATION_CONTACT) {
      // Location contact can only see their location
      const location = await this.locationsService.findOne(
        currentUser.locationId,
        currentUser,
      );
      locations = [location];
    }

    return locations.map((loc) => loc.deviceId);
  }

  /**
   * Get alarms with optional filters
   */
  async findAll(
    query: AlarmQueryDto,
    currentUser: User,
  ): Promise<AlarmResponseDto[]> {
    // Get accessible device IDs based on user role
    const accessibleDeviceIds = await this.getAccessibleDeviceIds(currentUser);

    if (accessibleDeviceIds.length === 0) {
      return [];
    }

    // Build query
    const queryBuilder = this.alarmsRepository
      .createQueryBuilder('alarm')
      .where('alarm.device_name IN (:...deviceIds)', {
        deviceIds: accessibleDeviceIds,
      });

    // Filter by specific device if provided
    if (query.deviceId) {
      if (!accessibleDeviceIds.includes(query.deviceId)) {
        throw new ForbiddenException('Access denied to this device');
      }
      queryBuilder.andWhere('alarm.device_name = :deviceId', {
        deviceId: query.deviceId,
      });
    }

    // Filter by date range
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('alarm.timestamp BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    // Order by timestamp descending (newest first)
    queryBuilder.orderBy('alarm.timestamp', 'DESC');

    // Limit results
    const limit = query.limit || 100;
    queryBuilder.limit(limit);

    const alarms = await queryBuilder.getMany();

    // Transform to DTOs and apply severity/type filters
    let transformedAlarms = alarms.map((alarm) => this.transformToDto(alarm));

    // Filter by severity if provided
    if (query.severity) {
      transformedAlarms = transformedAlarms.filter(
        (alarm) => alarm.severity === query.severity,
      );
    }

    // Filter by type if provided
    if (query.type) {
      transformedAlarms = transformedAlarms.filter((alarm) =>
        alarm.alarmType.includes(query.type!),
      );
    }

    return transformedAlarms;
  }

  /**
   * Get alarms for a specific device
   */
  async findByDevice(
    deviceId: string,
    currentUser: User,
  ): Promise<AlarmResponseDto[]> {
    return this.findAll({ deviceId, limit: 100 }, currentUser);
  }

  /**
   * Get latest reading for a device
   */
  async getLatestReading(deviceId: string): Promise<Alarm | null> {
    return await this.alarmsRepository.findOne({
      where: { deviceName: deviceId },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Get critical alarms only
   */
  async findCritical(currentUser: User): Promise<AlarmResponseDto[]> {
    return this.findAll(
      { severity: AlarmSeverity.CRITICAL, limit: 50 },
      currentUser,
    );
  }

  /**
   * Get alarm statistics for a device
   */
  async getStatistics(deviceId: string, currentUser: User) {
    const alarms = await this.findByDevice(deviceId, currentUser);

    const stats = {
      total: alarms.length,
      critical: alarms.filter((a) => a.severity === AlarmSeverity.CRITICAL)
        .length,
      warning: alarms.filter((a) => a.severity === AlarmSeverity.WARNING)
        .length,
      info: alarms.filter((a) => a.severity === AlarmSeverity.INFO).length,
      byType: {
        turbidity: alarms.filter((a) =>
          a.alarmType.includes(AlarmType.TURBIDITY),
        ).length,
        ph: alarms.filter((a) => a.alarmType.includes(AlarmType.PH)).length,
        temperature: alarms.filter((a) =>
          a.alarmType.includes(AlarmType.TEMPERATURE),
        ).length,
        voltage: alarms.filter((a) => a.alarmType.includes(AlarmType.VOLTAGE))
          .length,
        condition: alarms.filter((a) =>
          a.alarmType.includes(AlarmType.CONDITION),
        ).length,
      },
      latest: alarms[0] || null,
    };

    return stats;
  }

  // async getLatestReading(deviceId: string): Promise<Alarm | null> {
  //   return await this.alarmsRepository.findOne({
  //     where: { deviceName: deviceId },
  //     order: { timestamp: 'DESC' },
  //   });
  // }

  async processNewAlarm(alarmData: Partial<Alarm>): Promise<Alarm> {
    console.log('processNewAlarm method called with:', alarmData);

    const newAlarm = this.alarmsRepository.create(alarmData);
    const savedAlarm = await this.alarmsRepository.save(newAlarm);
    console.log('Alarm saved:', savedAlarm);

    // Find location with company and all users
    const location = await this.locationsRepository.findOne({
      where: { deviceId: savedAlarm.deviceName },
      relations: ['company', 'company.users', 'users'],
    });

    if (!location) {
      console.error(`Location not found for device: ${savedAlarm.deviceName}`);
      return savedAlarm;
    }
    console.log('Location found:', location.id);

    const alarmDto = this.transformToDto(savedAlarm);
    const locationName = location.name;

    // Send to location contact
    const locationContact = location.users?.find(
      (user) => user.role === UserRole.LOCATION_CONTACT,
    );

    if (locationContact) {
      console.log('Sending to location contact:', locationContact.email);
      await this.mailService.sendAlarmNotificationEmail(
        locationContact.email,
        alarmDto,
        locationName,
      );
    }

    // Send to company admin
    const companyAdmin = location.company?.users?.find(
      (user) => user.role === UserRole.COMPANY_ADMIN,
    );

    if (companyAdmin) {
      console.log('Sending to company admin:', companyAdmin.email);
      await this.mailService.sendAlarmNotificationEmail(
        companyAdmin.email,
        alarmDto,
        locationName,
      );
    }

    return savedAlarm;
  }
}

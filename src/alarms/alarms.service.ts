import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alarm, AlarmSeverity, AlarmType } from './entities/alarm.entity';
import { AlarmResponseDto, AlarmQueryDto } from './dto/alarm-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationsService } from '../locations/locations.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AlarmsService {
  // Track last notification state per device to detect state changes
  private lastNotificationState: Map<
    string,
    { isAnomalous: boolean; timestamp: number }
  > = new Map();
  private readonly NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Alarm)
    private alarmsRepository: Repository<Alarm>,
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    private locationsService: LocationsService,
    private mailService: MailService,
  ) {}

  /**
   * Determine if a reading is anomalous (needs alert)
   */
  private isAnomalous(alarm: Alarm): boolean {
    // Check for invalid/problematic states
    const problematicPhStatuses = ['INVALID', 'IN AIR'];
    const problematicTurbidityStatuses = ['NO INPUT', 'NOT CLEAN'];
    const problematicWaterQualities = ['POOR', 'UNKNOWN', ''];

    return (
      problematicPhStatuses.includes(alarm.phStatus) ||
      problematicTurbidityStatuses.includes(alarm.turbidityStatus) ||
      problematicWaterQualities.includes(alarm.waterQuality || '') ||
      alarm.ph === 0 ||
      alarm.turbidityNtu >= 100 ||
      (alarm.ph > 0 && (alarm.ph < 6.5 || alarm.ph > 8.5))
    );
  }

  /**
   * Determine alarm severity
   */
  private determineSeverity(alarm: Alarm): AlarmSeverity {
    // If readings look good
    if (!this.isAnomalous(alarm)) {
      return AlarmSeverity.NORMAL;
    }

    // Critical conditions
    if (
      alarm.phStatus === 'INVALID' ||
      alarm.phStatus === 'IN AIR' ||
      alarm.turbidityStatus === 'NOT CLEAN' ||
      alarm.ph === 0 ||
      alarm.turbidityNtu > 200
    ) {
      return AlarmSeverity.CRITICAL;
    }

    // Warning conditions
    if (
      alarm.turbidityStatus === 'NO INPUT' ||
      alarm.waterQuality === 'POOR' ||
      alarm.waterQuality === 'UNKNOWN' ||
      (alarm.ph > 0 && (alarm.ph < 6.5 || alarm.ph > 8.5))
    ) {
      return AlarmSeverity.WARNING;
    }

    return AlarmSeverity.INFO;
  }

  /**
   * Determine alarm types
   */
  private determineAlarmTypes(alarm: Alarm): AlarmType[] {
    const types: AlarmType[] = [];

    if (
      alarm.phStatus === 'INVALID' ||
      alarm.phStatus === 'IN AIR' ||
      alarm.ph === 0 ||
      (alarm.ph > 0 && (alarm.ph < 6.5 || alarm.ph > 8.5))
    ) {
      types.push(AlarmType.PH);
    }

    if (alarm.turbidityStatus !== 'CLEAN' || alarm.turbidityNtu >= 100) {
      types.push(AlarmType.TURBIDITY);
    }

    if (
      alarm.waterQuality &&
      ['POOR', 'UNKNOWN'].includes(alarm.waterQuality)
    ) {
      types.push(AlarmType.WATER_QUALITY);
    }

    if (types.length === 0) {
      types.push(AlarmType.SYSTEM);
    }

    return types;
  }

  /**
   * Generate message based on severity and explanation
   */
  private generateMessage(alarm: Alarm, severity: AlarmSeverity): string {
    const prefix =
      severity === AlarmSeverity.CRITICAL
        ? '🔴 CRITICAL'
        : severity === AlarmSeverity.WARNING
          ? '⚠️ WARNING'
          : severity === AlarmSeverity.NORMAL
            ? '✅ NORMAL'
            : 'ℹ️ INFO';

    return `${prefix} - ${alarm.explanation}`;
  }

  /**
   * Transform alarm to DTO
   */
  private transformToDto(alarm: Alarm): AlarmResponseDto {
    const severity = this.determineSeverity(alarm);
    const alarmType = this.determineAlarmTypes(alarm);
    const message = this.generateMessage(alarm, severity);

    return {
      id: alarm.id,
      deviceName: alarm.deviceName,
      ph: Number(alarm.ph),
      phStatus: alarm.phStatus,
      turbidityNtu: alarm.turbidityNtu,
      turbidityStatus: alarm.turbidityStatus,
      waterQuality: alarm.waterQuality || '',
      explanation: alarm.explanation,
      createdAt: alarm.createdAt,
      severity,
      alarmType,
      message,
    };
  }

  /**
   * Check if we should send notification based on state change
   */
  private shouldSendNotification(
    deviceName: string,
    currentIsAnomalous: boolean,
  ): boolean {
    const lastState = this.lastNotificationState.get(deviceName);
    const now = Date.now();

    // First reading ever - send notification
    if (!lastState) {
      this.lastNotificationState.set(deviceName, {
        isAnomalous: currentIsAnomalous,
        timestamp: now,
      });
      return true;
    }

    // State changed (anomalous -> normal OR normal -> anomalous)
    if (lastState.isAnomalous !== currentIsAnomalous) {
      this.lastNotificationState.set(deviceName, {
        isAnomalous: currentIsAnomalous,
        timestamp: now,
      });
      return true;
    }

    // Same state, but cooldown expired (send reminder)
    if (now - lastState.timestamp > this.NOTIFICATION_COOLDOWN_MS) {
      this.lastNotificationState.set(deviceName, {
        isAnomalous: currentIsAnomalous,
        timestamp: now,
      });
      return true;
    }

    return false;
  }

  /**
   * Process new alarm reading
   */
  /**
   * Process new alarm reading
   */
  async processNewAlarm(alarmData: Partial<Alarm>): Promise<void> {
    console.log('processNewAlarm method called with:', alarmData);

    const deviceName = alarmData.deviceName!;
    const alarmDto = this.transformToDto(alarmData as Alarm);
    const isAnomalous = this.isAnomalous(alarmData as Alarm);

    console.log(
      `📊 Reading is ${isAnomalous ? 'ANOMALOUS' : 'NORMAL'} - Severity: ${alarmDto.severity}`,
    );

    // Check if we should send notification
    if (!this.shouldSendNotification(deviceName, isAnomalous)) {
      console.log(
        '⏭️  Notification skipped - no state change or cooldown active',
      );
      return;
    }

    // Find location
    const location = await this.locationsRepository.findOne({
      where: { deviceId: deviceName },
      relations: ['company', 'company.users', 'users'],
    });

    if (!location) {
      console.error(`Location not found for device: ${deviceName}`);
      return;
    }

    console.log('Location found:', location.id);
    const locationName = location.name;

    // Determine notification type
    const notificationType = isAnomalous ? 'ALERT' : 'ALL_CLEAR';

    // Send to ALL location contacts (not just one)
    const locationContacts =
      location.users?.filter(
        (user) => user.role === UserRole.LOCATION_CONTACT,
      ) || [];

    if (locationContacts.length > 0) {
      console.log(
        `📧 Sending ${notificationType} to ${locationContacts.length} location contact(s)`,
      );

      // Send email to all location contacts
      const emailPromises = locationContacts.map((contact) => {
        console.log(`   → Sending to location contact: ${contact.email}`);
        return this.mailService.sendAlarmNotificationEmail(
          contact.email,
          alarmDto,
          locationName,
          notificationType,
        );
      });

      // Send all emails in parallel
      await Promise.all(emailPromises);
    } else {
      console.warn(
        `⚠️  No location contacts found for location: ${location.id}`,
      );
    }

    // Send to company admin
    const companyAdmin = location.company?.users?.find(
      (user) => user.role === UserRole.COMPANY_ADMIN,
    );

    if (companyAdmin) {
      console.log(
        `📧 Sending ${notificationType} to company admin: ${companyAdmin.email}`,
      );
      await this.mailService.sendAlarmNotificationEmail(
        companyAdmin.email,
        alarmDto,
        locationName,
        notificationType,
      );
    } else {
      console.warn(
        `⚠️  No company admin found for company: ${location.company?.id}`,
      );
    }

    console.log('✅ Notification processing completed');
  }

  // ... rest of your service methods (findAll, findByDevice, etc.) - update to use new schema

  async getLatestReading(deviceId: string): Promise<Alarm | null> {
    return await this.alarmsRepository.findOne({
      where: { deviceName: deviceId },
      order: { createdAt: 'DESC' },
    });
  }

  private async getAccessibleDeviceIds(currentUser: User): Promise<string[]> {
    let locations: Location[] = [];

    if (currentUser.role === UserRole.SUPERADMIN) {
      locations = await this.locationsService.findAll(currentUser);
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      locations = await this.locationsService.findByCompany(
        currentUser.companyId,
      );
    } else if (currentUser.role === UserRole.LOCATION_CONTACT) {
      const location = await this.locationsService.findOne(
        currentUser.locationId,
        currentUser,
      );
      locations = [location];
    }

    return locations.map((loc) => loc.deviceId);
  }

  async findAll(
    query: AlarmQueryDto,
    currentUser: User,
  ): Promise<AlarmResponseDto[]> {
    const accessibleDeviceIds = await this.getAccessibleDeviceIds(currentUser);

    if (accessibleDeviceIds.length === 0) {
      return [];
    }

    const queryBuilder = this.alarmsRepository
      .createQueryBuilder('alarm')
      .where('alarm.device_name IN (:...deviceIds)', {
        deviceIds: accessibleDeviceIds,
      });

    if (query.deviceId) {
      if (!accessibleDeviceIds.includes(query.deviceId)) {
        throw new ForbiddenException('Access denied to this device');
      }
      queryBuilder.andWhere('alarm.device_name = :deviceId', {
        deviceId: query.deviceId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere(
        'alarm.created_at BETWEEN :startDate AND :endDate',
        {
          startDate: query.startDate,
          endDate: query.endDate,
        },
      );
    }

    queryBuilder.orderBy('alarm.created_at', 'DESC');
    const limit = query.limit || 100;
    queryBuilder.limit(limit);

    const alarms = await queryBuilder.getMany();
    let transformedAlarms = alarms.map((alarm) => this.transformToDto(alarm));

    if (query.severity) {
      transformedAlarms = transformedAlarms.filter(
        (alarm) => alarm.severity === query.severity,
      );
    }

    if (query.type) {
      transformedAlarms = transformedAlarms.filter((alarm) =>
        alarm.alarmType.includes(query.type!),
      );
    }

    return transformedAlarms;
  }

  async findByDevice(
    deviceId: string,
    currentUser: User,
  ): Promise<AlarmResponseDto[]> {
    return this.findAll({ deviceId, limit: 100 }, currentUser);
  }

  // Add these methods to the AlarmsService class

  async findCritical(currentUser: User): Promise<AlarmResponseDto[]> {
    return this.findAll(
      { severity: AlarmSeverity.CRITICAL, limit: 50 },
      currentUser,
    );
  }

  async getStatistics(deviceId: string, currentUser: User) {
    const alarms = await this.findByDevice(deviceId, currentUser);

    const stats = {
      total: alarms.length,
      critical: alarms.filter((a) => a.severity === AlarmSeverity.CRITICAL)
        .length,
      warning: alarms.filter((a) => a.severity === AlarmSeverity.WARNING)
        .length,
      normal: alarms.filter((a) => a.severity === AlarmSeverity.NORMAL).length,
      info: alarms.filter((a) => a.severity === AlarmSeverity.INFO).length,
      byType: {
        ph: alarms.filter((a) => a.alarmType.includes(AlarmType.PH)).length,
        turbidity: alarms.filter((a) =>
          a.alarmType.includes(AlarmType.TURBIDITY),
        ).length,
        waterQuality: alarms.filter((a) =>
          a.alarmType.includes(AlarmType.WATER_QUALITY),
        ).length,
        system: alarms.filter((a) => a.alarmType.includes(AlarmType.SYSTEM))
          .length,
      },
      latest: alarms[0] || null,
    };

    return stats;
  }
}

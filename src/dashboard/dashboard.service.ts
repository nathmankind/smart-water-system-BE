import { Injectable } from '@nestjs/common';
import { LocationsService } from '../locations/locations.service';
import { AlarmsService } from '../alarms/alarms.service';
import { User, UserRole } from '../users/entities/user.entity';

export class OverviewDto {
  totalLocations: number;
  activeAlarms: number;
  recentLocations: any[];
  recentAlarms: any[];
}

@Injectable()
export class DashboardService {
  constructor(
    private locationsService: LocationsService,
    private alarmsService: AlarmsService,
  ) {}

  async getOverview(currentUser: User): Promise<OverviewDto> {
    // Get all accessible locations
    const allLocations = await this.locationsService.findAll(currentUser);

    // Get recent 5 locations
    const recentLocations = allLocations.slice(0, 5).map((loc) => ({
      id: loc.id,
      name: loc.name,
      deviceId: loc.deviceId,
      address: `${loc.city}, ${loc.province}`,
      createdAt: loc.createdAt,
    }));

    // Get all alarms to count active ones
    const allAlarms = await this.alarmsService.findAll(
      { limit: 1000 },
      currentUser,
    );

    // Active alarms = critical or warning from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeAlarmsCount = allAlarms.filter(
      (alarm) =>
        (alarm.severity === 'critical' || alarm.severity === 'warning') &&
        new Date(alarm.createdAt) > twentyFourHoursAgo,
    ).length;

    // Get recent 10 alarms (any severity)
    const recentAlarms = allAlarms.slice(0, 10);

    return {
      totalLocations: allLocations.length,
      activeAlarms: activeAlarmsCount,
      recentLocations,
      recentAlarms,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlarmsService } from '../alarms/alarms.service';
import { CurrentReadings, AlarmSummary } from './dto/location-details.dto';

@Controller('locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly alarmsService: AlarmsService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  create(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() currentUser,
  ) {
    return this.locationsService.create(createLocationDto, currentUser);
  }

  @Get()
  findAll(@CurrentUser() currentUser) {
    return this.locationsService.findAll(currentUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser) {
    return this.locationsService.findOne(id, currentUser);
  }

  @Get(':id/details')
  async getLocationDetails(
    @Param('id') id: string,
    @CurrentUser() currentUser,
  ) {
    // First get the location to get the deviceId
    const location = await this.locationsService.findOne(id, currentUser);

    // Get alarms for this location's device
    const alarms = await this.alarmsService.findByDevice(
      location.deviceId,
      currentUser,
    );

    // Get latest reading
    const latestReading = await this.alarmsService.getLatestReading(
      location.deviceId,
    );

    // Filter active alarms (critical and warning from last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeAlarms = alarms.filter(
      (alarm) =>
        (alarm.severity === 'critical' || alarm.severity === 'warning') &&
        new Date(alarm.timestamp) > twentyFourHoursAgo,
    );

    // Count alarms by severity
    const criticalCount = alarms.filter(
      (a) => a.severity === 'critical',
    ).length;
    const warningCount = alarms.filter((a) => a.severity === 'warning').length;

    // Prepare current readings
    const currentReadings: CurrentReadings = latestReading
      ? {
          turbidity: latestReading.turbidity,
          ph: latestReading.ph ? Number(latestReading.ph) : 0.0,
          temperature: latestReading.temperature
            ? Number(latestReading.temperature)
            : 0.0,
          voltage: Number(latestReading.voltage),
          condition: latestReading.condition,
          timestamp: latestReading.timestamp,
        }
      : {
          turbidity: 0,
          ph: 0.0,
          temperature: 0.0,
          voltage: 0.0,
          condition: '--',
          timestamp: new Date(),
        };

    // Prepare alarm summary
    const alarmSummary: AlarmSummary = {
      total: alarms.length,
      critical: criticalCount,
      warning: warningCount,
      activeAlarms: activeAlarms.slice(0, 10), // Limit to 10 most recent active alarms
      latestReading: currentReadings,
    };

    // Get complete location details
    return this.locationsService.getLocationWithDetails(
      id,
      currentUser,
      alarmSummary,
    );
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @CurrentUser() currentUser,
  ) {
    return this.locationsService.update(id, updateLocationDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() currentUser) {
    return this.locationsService.remove(id, currentUser);
  }
}

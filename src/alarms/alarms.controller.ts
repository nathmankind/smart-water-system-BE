import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { AlarmQueryDto } from './dto/alarm-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Alarm, AlarmSeverity, AlarmType } from './entities/alarm.entity';

@Controller('alarms')
@UseGuards(AuthGuard('jwt'))
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  async findAll(
    @Query('deviceId') deviceId?: string,
    @Query('severity') severity?: AlarmSeverity,
    @Query('type') type?: AlarmType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: User,
  ) {
    const query: AlarmQueryDto = {
      deviceId,
      severity,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
    };

    return this.alarmsService.findAll(query, currentUser!);
  }

  @Get('critical')
  async findCritical(@CurrentUser() currentUser: User) {
    return this.alarmsService.findCritical(currentUser);
  }

  @Get('device/:deviceId')
  async findByDevice(
    @Param('deviceId') deviceId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.alarmsService.findByDevice(deviceId, currentUser);
  }

  @Get('device/:deviceId/statistics')
  async getStatistics(
    @Param('deviceId') deviceId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.alarmsService.getStatistics(deviceId, currentUser);
  }

  @Post('process')
  async processNewReading(@Body() alarmData: Partial<Alarm>) {
    return this.alarmsService.processNewAlarm(alarmData);
  }
}

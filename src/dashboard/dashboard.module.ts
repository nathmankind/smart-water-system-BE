import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { LocationsModule } from '../locations/locations.module';
import { AlarmsModule } from '../alarms/alarms.module';

@Module({
  imports: [LocationsModule, AlarmsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

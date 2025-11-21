import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { Alarm } from './entities/alarm.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationsModule } from '../locations/locations.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alarm, Location]),
    forwardRef(() => LocationsModule),
    MailModule,
  ],
  controllers: [AlarmsController],
  providers: [AlarmsService],
  exports: [AlarmsService],
})
export class AlarmsModule {}

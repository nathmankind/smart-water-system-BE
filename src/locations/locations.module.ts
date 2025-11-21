import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { Location } from './entities/location.entity';
import { UsersModule } from '../users/users.module';
import { AlarmsModule } from '../alarms/alarms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location]),
    forwardRef(() => UsersModule),
    forwardRef(() => AlarmsModule),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService, TypeOrmModule],
})
export class LocationsModule {}

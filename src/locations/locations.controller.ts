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

@Controller('locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

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

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  ClassSerializerInterceptor,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser,
  ) {
    return this.usersService.create(createUserDto, currentUser);
  }

  @Post('bootstrap')
  async bootstrap(@Body() createUserDto: CreateUserDto) {
    // Special endpoint for creating the first superadmin only
    const userCount = await this.usersService.count();

    if (userCount > 0) {
      throw new UnauthorizedException(
        'Bootstrap endpoint only available when no users exist',
      );
    }

    if (createUserDto.role !== UserRole.SUPERADMIN) {
      throw new UnauthorizedException(
        'Bootstrap endpoint only for creating superadmin',
      );
    }

    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  findAll(@CurrentUser() currentUser) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  findOne(@Param('id') id: string, @CurrentUser() currentUser) {
    return this.usersService.findOne(id, currentUser);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  changePassword(
    @CurrentUser() currentUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(currentUser.id, changePasswordDto);
  }
}

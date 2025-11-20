import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    private usersService: UsersService,
  ) {}

  async create(
    createLocationDto: CreateLocationDto,
    currentUser: User,
  ): Promise<{ location: Location; contactUser: any }> {
    // Company admins can only create locations for their own company
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (createLocationDto.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'You can only create locations for your company',
        );
      }
    }

    // Check if deviceId already exists
    const existingLocation = await this.locationsRepository.findOne({
      where: { deviceId: createLocationDto.deviceId },
    });

    if (existingLocation) {
      throw new ConflictException(
        'A location with this device ID already exists',
      );
    }

    // Extract location contact from DTO
    const { locationContact, ...locationData } = createLocationDto;

    // Create location
    const location = this.locationsRepository.create(locationData);
    const savedLocation = await this.locationsRepository.save(location);

    // Use contactEmail if locationContact.email is not provided
    const contactUserEmail =
      locationContact.email || createLocationDto.contactEmail;

    // Create location contact user automatically
    const contactUser = await this.usersService.create(
      {
        firstName: locationContact.firstName,
        lastName: locationContact.lastName,
        email: contactUserEmail,
        role: UserRole.LOCATION_CONTACT,
        companyId: savedLocation.companyId,
        locationId: savedLocation.id,
      },
      currentUser,
    );

    return { location: savedLocation, contactUser };
  }

  async findAll(currentUser: User): Promise<Location[]> {
    const queryBuilder = this.locationsRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.company', 'company')
      .leftJoinAndSelect('location.users', 'users');

    // Company admins only see their company's locations
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      queryBuilder.where('location.companyId = :companyId', {
        companyId: currentUser.companyId,
      });
    }

    // Location contacts only see their own location
    if (currentUser.role === UserRole.LOCATION_CONTACT) {
      queryBuilder.where('location.id = :locationId', {
        locationId: currentUser.locationId,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, currentUser: User): Promise<Location> {
    const location = await this.locationsRepository.findOne({
      where: { id },
      relations: ['company', 'users'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    // Check access permissions
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (location.companyId !== currentUser.companyId) {
        throw new ForbiddenException('Access denied');
      }
    }

    if (currentUser.role === UserRole.LOCATION_CONTACT) {
      if (location.id !== currentUser.locationId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return location;
  }

  async findByDeviceId(deviceId: string): Promise<Location | null> {
    return await this.locationsRepository.findOne({
      where: { deviceId },
      relations: ['company', 'users'],
    });
  }

  async findByCompany(companyId: string): Promise<Location[]> {
    return await this.locationsRepository.find({
      where: { companyId },
      relations: ['users'],
    });
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
    currentUser: User,
  ): Promise<Location> {
    const location = await this.findOne(id, currentUser);

    Object.assign(location, updateLocationDto);
    return await this.locationsRepository.save(location);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const location = await this.findOne(id, currentUser);
    await this.locationsRepository.remove(location);
  }
}

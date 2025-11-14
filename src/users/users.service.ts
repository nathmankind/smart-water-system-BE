import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  private generateRandomPassword(length: number = 12): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async create(createUserDto: CreateUserDto, createdBy?: User): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate role and company/location relationships
    if (
      createUserDto.role === UserRole.COMPANY_ADMIN &&
      !createUserDto.companyId
    ) {
      throw new BadRequestException(
        'Company admins must be assigned to a company',
      );
    }

    if (
      createUserDto.role === UserRole.LOCATION_CONTACT &&
      (!createUserDto.companyId || !createUserDto.locationId)
    ) {
      throw new BadRequestException(
        'Location contacts must be assigned to both a company and a location',
      );
    }

    if (
      createUserDto.role === UserRole.SUPERADMIN &&
      (createUserDto.companyId || createUserDto.locationId)
    ) {
      throw new BadRequestException(
        'Superadmins cannot be assigned to a company or location',
      );
    }

    // Validate permissions
    if (createdBy) {
      if (createdBy.role === UserRole.COMPANY_ADMIN) {
        // Company admins can only create location contacts for their company
        if (createUserDto.role !== UserRole.LOCATION_CONTACT) {
          throw new BadRequestException(
            'Company admins can only create location contacts',
          );
        }
        if (createUserDto.companyId !== createdBy.companyId) {
          throw new BadRequestException(
            'You can only create users for your company',
          );
        }
      }
    }

    let password: string;
    let mustChangePassword = false;

    // Auto-generate password for company admins and location contacts
    if (createUserDto.role !== UserRole.SUPERADMIN && !createUserDto.password) {
      password = this.generateRandomPassword();
      mustChangePassword = true;

      // Send email with temporary password
      await this.mailService.sendWelcomeEmail(
        createUserDto.email,
        password,
        createUserDto.firstName,
      );
    } else if (createUserDto.password) {
      password = createUserDto.password;
    } else {
      throw new BadRequestException('Password is required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      mustChangePassword,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(currentUser?: User): Promise<User[]> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.location', 'location');

    // Company admins only see users from their company
    if (currentUser && currentUser.role === UserRole.COMPANY_ADMIN) {
      queryBuilder.where('user.companyId = :companyId', {
        companyId: currentUser.companyId,
      });
    }

    // Location contacts only see themselves
    if (currentUser && currentUser.role === UserRole.LOCATION_CONTACT) {
      queryBuilder.where('user.id = :userId', {
        userId: currentUser.id,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, currentUser?: User): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['company', 'location'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check access permissions
    if (currentUser && currentUser.role === UserRole.COMPANY_ADMIN) {
      if (user.companyId !== currentUser.companyId) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }

    if (currentUser && currentUser.role === UserRole.LOCATION_CONTACT) {
      if (user.id !== currentUser.id) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
      relations: ['company', 'location'],
    });
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;

    await this.usersRepository.save(user);
  }

  async count(): Promise<number> {
    return await this.usersRepository.count();
  }
}

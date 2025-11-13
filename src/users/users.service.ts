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

    // Validate role and company relationship
    if (createUserDto.role === UserRole.USER && !createUserDto.companyId) {
      throw new BadRequestException(
        'Regular users must be assigned to a company',
      );
    }

    if (createUserDto.role === UserRole.SUPERADMIN && createUserDto.companyId) {
      throw new BadRequestException(
        'Superadmins cannot be assigned to a company',
      );
    }

    let password: string;
    let mustChangePassword = false;

    // If created by superadmin and it's a regular user, generate password
    if (
      createdBy?.role === UserRole.SUPERADMIN &&
      createUserDto.role === UserRole.USER
    ) {
      password = this.generateRandomPassword();
      mustChangePassword = true;

      // Send email with temporary password
      await this.mailService.sendWelcomeEmail(
        createUserDto.email,
        password,
        createUserDto.firstName,
      );
    } else if (createUserDto.password) {
      // For superadmin creation or self-registration
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
      .leftJoinAndSelect('user.company', 'company');

    // If user is not superadmin, only show users from their company
    if (currentUser && currentUser.role !== UserRole.SUPERADMIN) {
      queryBuilder.where('user.companyId = :companyId', {
        companyId: currentUser.companyId,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, currentUser?: User): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check access permissions
    if (currentUser && currentUser.role !== UserRole.SUPERADMIN) {
      if (user.companyId !== currentUser.companyId) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
      relations: ['company'],
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

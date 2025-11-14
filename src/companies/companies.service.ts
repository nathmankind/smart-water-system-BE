import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private usersService: UsersService,
  ) {}

  async create(
    createCompanyDto: CreateCompanyDto,
  ): Promise<{ company: Company; adminUser: any }> {
    const existingCompany = await this.companiesRepository.findOne({
      where: { name: createCompanyDto.name },
    });

    if (existingCompany) {
      throw new ConflictException('Company with this name already exists');
    }

    // Extract admin contact from DTO
    const { adminContact, ...companyData } = createCompanyDto;

    // Create company
    const company = this.companiesRepository.create(companyData);
    const savedCompany = await this.companiesRepository.save(company);

    // Create company admin user
    const adminUser = await this.usersService.create({
      firstName: adminContact.firstName,
      lastName: adminContact.lastName,
      email: adminContact.email,
      role: UserRole.COMPANY_ADMIN,
      companyId: savedCompany.id,
    });

    return { company: savedCompany, adminUser };
  }

  async findAll(): Promise<Company[]> {
    return await this.companiesRepository.find({
      relations: ['users', 'locations'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
      relations: ['users', 'locations'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(id);

    if (updateCompanyDto.name && updateCompanyDto.name !== company.name) {
      const existingCompany = await this.companiesRepository.findOne({
        where: { name: updateCompanyDto.name },
      });

      if (existingCompany) {
        throw new ConflictException('Company with this name already exists');
      }
    }

    Object.assign(company, updateCompanyDto);
    return await this.companiesRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companiesRepository.remove(company);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { UsersService } from '../users/users.service';

describe('CompaniesService', () => {
  let service: CompaniesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

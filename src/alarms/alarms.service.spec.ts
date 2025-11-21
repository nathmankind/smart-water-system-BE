import { Test, TestingModule } from '@nestjs/testing';
import { AlarmsService } from './alarms.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alarm } from './entities/alarm.entity';
import { LocationsService } from '../locations/locations.service';
import { MailService } from '../mail/mail.service';

describe('AlarmsService', () => {
  let service: AlarmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmsService,
        {
          provide: getRepositoryToken(Alarm),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: LocationsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findByCompany: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
            findByDeviceId: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendAlarmNotificationEmail: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<AlarmsService>(AlarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

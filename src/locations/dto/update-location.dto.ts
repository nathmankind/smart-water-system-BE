import { PartialType } from '@nestjs/mapped-types';
import { CreateLocationDto } from './create-location.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateLocationDto extends PartialType(
  OmitType(CreateLocationDto, ['companyId'] as const),
) {}

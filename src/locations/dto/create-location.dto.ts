import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsUUID,
  IsIP,
} from 'class-validator';

export class CreateLocationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  contactEmail: string;

  @IsNotEmpty()
  @Matches(/^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, {
    message: 'Invalid phone number format',
  })
  contactPhone: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  province: string;

  @IsNotEmpty()
  @Matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, {
    message: 'Invalid Canadian postal code format (e.g., K1A 0B1)',
  })
  postalCode: string;

  @IsNotEmpty()
  @IsUUID()
  companyId: string;
}

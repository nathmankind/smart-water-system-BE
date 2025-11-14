import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Location } from '../../locations/entities/location.entity';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  COMPANY_ADMIN = 'company_admin',
  LOCATION_CONTACT = 'location_contact',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.LOCATION_CONTACT,
  })
  role: UserRole;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @ManyToOne(() => Location, (location) => location.users, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

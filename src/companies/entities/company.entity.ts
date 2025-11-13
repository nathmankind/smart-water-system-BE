import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'contact_email' })
  contactEmail: string;

  @Column({ name: 'contact_phone' })
  contactPhone: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column({ name: 'postal_code' })
  postalCode: string;

  @Column({ default: 'Canada' })
  country: string;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

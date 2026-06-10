import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  ANALYST = 'analyst',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true, type: 'varchar' })
  displayName: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.FREE })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'varchar' })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

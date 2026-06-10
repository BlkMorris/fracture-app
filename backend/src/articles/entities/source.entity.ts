import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SourceTier } from '../../common/enums';
import { Article } from './article.entity';

@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  rssFeedUrl: string;

  @Column({
    type: 'enum',
    enum: SourceTier,
    default: SourceTier.TIER_2,
  })
  tier: SourceTier;

  /** AllSides / MBFC baseline political lean [-1.0 left, +1.0 right] */
  @Column({ type: 'float', default: 0 })
  politicalLeanPrior: number;

  /** Establishment vs outsider baseline [-1.0 outsider, +1.0 establishment] */
  @Column({ type: 'float', default: 0 })
  establishmentPrior: number;

  /** Editorial reliability score [0.0 – 1.0] */
  @Column({ type: 'float', default: 0.5 })
  reliabilityScore: number;

  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB" */
  @Column({ nullable: true })
  country: string;

  /** Geographic region for narrative-map grouping */
  @Column({ nullable: true })
  region: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 300 })
  fetchIntervalSeconds: number;

  @OneToMany(() => Article, (article) => article.source)
  articles: Article[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

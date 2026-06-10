import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { FramingType, LedeType } from '../../common/enums';
import { Source } from './source.entity';
import { StoryCluster } from './story-cluster.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Core content ────────────────────────────────────
  @Column()
  @Index()
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ unique: true })
  @Index()
  url: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  @Index()
  ingestedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Source relationship ─────────────────────────────
  @ManyToOne(() => Source, (source) => source.articles, { eager: true })
  @JoinColumn({ name: 'sourceId' })
  source: Source;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  sourceId: string;

  // ── Story clustering ────────────────────────────────
  @ManyToOne(() => StoryCluster, (cluster) => cluster.articles, {
    nullable: true,
    onDelete: 'SET NULL',
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'storyClusterId' })
  cluster: StoryCluster;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  storyClusterId: string;

  @Column({ default: false })
  firstInCluster: boolean;

  @Column({ type: 'float', nullable: true })
  clusterCentroidDistance: number;

  // ── Bias coordinates ────────────────────────────────
  /** Political lean: -1.0 (far left) to +1.0 (far right) */
  @Column({ type: 'float', nullable: true })
  politicalLeanScore: number;

  /** Establishment alignment: -1.0 (outsider) to +1.0 (establishment) */
  @Column({ type: 'float', nullable: true })
  establishmentScore: number;

  // ── Framing metadata ────────────────────────────────
  @Column({
    type: 'enum',
    enum: FramingType,
    nullable: true,
  })
  framingType: FramingType;

  @Column({ type: 'float', nullable: true })
  framingConfidence: number;

  // ── Linguistic features ─────────────────────────────
  /** Headline sentiment: -1.0 (negative) to +1.0 (positive) */
  @Column({ type: 'float', nullable: true })
  headlineSentiment: number;

  /** Body sentiment: -1.0 (negative) to +1.0 (positive) */
  @Column({ type: 'float', nullable: true })
  bodySentiment: number;

  /** |headline_sentiment - body_sentiment| — clickbait indicator */
  @Column({ type: 'float', nullable: true })
  headlineBodySentimentGap: number;

  @Column({ type: 'float', nullable: true })
  emotionalValence: number;

  @Column({ type: 'float', nullable: true })
  certaintyLanguageScore: number;

  /** Quotes per paragraph */
  @Column({ type: 'float', nullable: true })
  attributionDensity: number;

  @Column({ type: 'float', nullable: true })
  passiveVoiceRatio: number;

  // ── Structural features ─────────────────────────────
  @Column({
    type: 'enum',
    enum: LedeType,
    nullable: true,
  })
  ledeType: LedeType;

  @Column({ type: 'int', nullable: true })
  sourceCount: number;

  @Column({ type: 'float', nullable: true })
  namedSourceRatio: number;

  @Column({ type: 'int', nullable: true })
  paragraphCount: number;

  @Column({ type: 'float', nullable: true })
  quoteToNarrativeRatio: number;

  // ── Narrative position ──────────────────────────────
  @Column({ type: 'float', nullable: true })
  divergenceFromMedian: number;

  @Column({ type: 'float', nullable: true })
  narrativeShiftDelta: number;

  // ── Deduplication ───────────────────────────────────
  @Column({ type: 'bigint', nullable: true })
  @Index()
  simhash: string;
}

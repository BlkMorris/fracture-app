import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores trending keywords/topics detected from external sources.
 * Used to boost hero story ranking for clusters matching real-world trends.
 */
@Entity('trend_signals')
export class TrendSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The trending keyword or phrase */
  @Column({ type: 'text' })
  @Index()
  keyword: string;

  /** Source of the trend signal (e.g. 'google_news', 'reuters', 'ap_news', 'x_trending') */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  source: string;

  /** Trend strength score (0–100) */
  @Column({ type: 'float', default: 50 })
  trendScore: number;

  /** When this trend was detected */
  @CreateDateColumn()
  @Index()
  detectedAt: Date;
}

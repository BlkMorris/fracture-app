import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Article } from './article.entity';

/**
 * Major news categories used for hero eligibility filtering.
 */
export enum TopicCategoryEnum {
  POLITICS = 'politics',
  WORLD = 'world',
  ECONOMY = 'economy',
  CONFLICT = 'conflict',
  ELECTIONS = 'elections',
  POLICY = 'policy',
  GEOPOLITICS = 'geopolitics',
  UNCATEGORIZED = 'uncategorized',
}

/**
 * Cluster lifecycle statuses:
 *
 * BREAKING  — created within the last 24 hours, high article velocity
 * ACTIVE    — contains articles within the last 14 days, still accepting new articles
 * ARCHIVED  — no new articles for 14+ days, frozen for historical reference
 */
export enum ClusterStatus {
  BREAKING = 'BREAKING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Represents a real-world story or event covered by multiple news outlets.
 *
 * A StoryCluster groups articles that discuss the same topic/event within a
 * time window. Fracture then computes narrative divergence (FDI) across the
 * articles in each cluster to surface how different outlets frame the same story.
 *
 * Clusters are identified via three signals:
 *   1. Topic similarity  — shared keywords and named entities
 *   2. Headline similarity — bigram overlap + TF-IDF cosine
 *   3. Time window — articles must fall within 14 days of cluster creation
 */
@Entity('story_clusters')
export class StoryCluster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable cluster topic label derived from the first article's title */
  @Column({ type: 'text' })
  @Index()
  topic: string;

  /** AI-neutral summary synthesising the cluster's coverage */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /**
   * Extracted topic keywords used for similarity matching.
   * Stored as JSON array for fast retrieval during clustering.
   */
  @Column({ type: 'jsonb', default: [] })
  topicKeywords: string[];

  /** Lifecycle status: BREAKING → ACTIVE → ARCHIVED */
  @Column({
    type: 'enum',
    enum: ClusterStatus,
    default: ClusterStatus.BREAKING,
  })
  @Index()
  status: ClusterStatus;

  // ── Denormalised aggregates (updated on each article assignment) ──

  /** Total number of articles in this cluster */
  @Column({ type: 'int', default: 1 })
  articleCount: number;

  /** Number of distinct news sources covering this story */
  @Column({ type: 'int', default: 1 })
  sourceCount: number;

  /** Cached Fracture Divergence Index (0–100), recomputed periodically */
  @Column({ type: 'float', nullable: true })
  divergenceScore: number | null;

  /** Article velocity: articles per hour since cluster creation */
  @Column({ type: 'float', nullable: true })
  velocityScore: number | null;

  /** Cluster is marked "fractured" when divergenceScore ≥ 40 and sourceCount ≥ 2 */
  @Column({ default: false })
  @Index()
  isFractured: boolean;

  /** Classified topic category for hero eligibility filtering */
  @Column({
    type: 'varchar',
    length: 30,
    default: TopicCategoryEnum.UNCATEGORIZED,
  })
  @Index()
  topicCategory: string;

  /** Representative image URL for this cluster */
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  /** Timestamp of the newest article actually added to this cluster */
  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  newestArticleAt: Date | null;

  /** Timestamp of the oldest article in this cluster */
  @Column({ type: 'timestamptz', nullable: true })
  oldestArticleAt: Date | null;

  // ── Relations ───────────────────────────────────────

  @OneToMany(() => Article, (article) => article.cluster)
  articles: Article[];

  // ── Timestamps ──────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

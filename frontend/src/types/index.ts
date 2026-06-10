// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fracture — Frontend Type Contracts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Source ────────────────────────────────────────────
export interface Source {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  tier: 'TIER_1_BREAKING' | 'TIER_1_STANDARD' | 'TIER_2' | 'TIER_3';
  politicalLeanPrior: number;
  establishmentPrior: number;
  reliabilityScore: number;
  country: string | null;
  region: string | null;
}

// ── Article ──────────────────────────────────────────
export interface Article {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  source: Source;
  politicalLeanScore: number | null;
  establishmentScore: number | null;
  headlineSentiment: number | null;
  bodySentiment: number | null;
  framingType: FramingType | null;
  framingConfidence: number | null;
}

export type FramingType =
  | 'CONFLICT'
  | 'HUMAN_INTEREST'
  | 'ECONOMIC'
  | 'MORAL'
  | 'RESPONSIBILITY';

// ── Story Cluster ────────────────────────────────────
export interface StoryCluster {
  id: string;
  topic: string;
  summary: string | null;
  topicKeywords: string[];
  status: ClusterStatus;
  articleCount: number;
  sourceCount: number;
  divergenceScore: number | null;
  velocityScore: number | null;
  isFractured: boolean;
  topicCategory: string;
  imageUrl: string | null;
  newestArticleAt: string | null;
  oldestArticleAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClusterStatus = 'BREAKING' | 'ACTIVE' | 'ARCHIVED';

// ── Divergence Index ─────────────────────────────────
export interface DivergenceIndex {
  overall: number;
  headlineSentimentSpread: number;
  framingTypeEntropy: number;
  entityFramingDivergence: number;
  linguisticEmbeddingSpread: number;
  sourceSelectionVariance: number;
  structuralDivergence: number;
}

// ── Narrative Frame ──────────────────────────────────
export interface NarrativeFrame {
  id: string;
  title: string;
  summary: string;
  sources: { name: string; slug: string }[];
  articleIds: string[];
}

// ── Headline Comparison ──────────────────────────────
export interface HeadlineEntry {
  sourceSlug: string;
  sourceName: string;
  headline: string;
  lean: number;
  sentiment: number;
  publishedAt: string;
  articleId: string;
}

// ── Story Detail (combined cluster response) ─────────
export interface StoryDetail {
  cluster: StoryCluster;
  articles: Article[];
  divergenceIndex: DivergenceIndex | null;
  narrativeFrames: NarrativeFrame[];
  headlineComparison: HeadlineEntry[];
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  articleId: string;
  sourceSlug: string;
  sourceName: string;
  publishedAt: string;
  lean: number;
  sentiment: number;
  title: string;
}

// ── Homepage ─────────────────────────────────────────
export interface HomepageData {
  hero: StoryCluster | null;
  trending: StoryCluster[];
  mostFractured: StoryCluster | null;
  latest: LatestArticle[];
  breakingCount: number;
}

export interface LatestArticle {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  source: { name: string; slug: string };
  storyClusterId: string | null;
}

// ── Stats ────────────────────────────────────────────
export interface PlatformStats {
  activeStories: number;
  avgDivergence: number;
  sourcesTracked: number;
}

// ── Search ───────────────────────────────────────────
export interface SearchResult {
  clusters: StoryCluster[];
  articles: Article[];
  relatedTopics: string[];
  totalClusters: number;
  totalArticles: number;
}

// ── Auth ─────────────────────────────────────────────
export type UserRole = 'free' | 'pro' | 'analyst' | 'enterprise' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

// ── Fracture Brief ───────────────────────────────────
export interface FractureBriefData {
  brief: string | null;
  error?: string;
  clusterId: string;
  generatedAt: string;
}

// ── Market Data ──────────────────────────────────────
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface PredictionMarket {
  id: string;
  title: string;
  probability: number;
  volume24h: number;
  url: string;
}

// ── Severity / Category Enums ────────────────────────
export type SeverityTier = 'Low' | 'Moderate' | 'High' | 'Extreme';
export type LeanCategory = 'Far Left' | 'Left-Leaning' | 'Center' | 'Right-Leaning' | 'Far Right';

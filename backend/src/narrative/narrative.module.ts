import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Article } from '../articles/entities/article.entity';
import { Source } from '../articles/entities/source.entity';
import { StoryCluster } from '../articles/entities/story-cluster.entity';
import { TrendSignal } from '../articles/entities/trend-signal.entity';
import { SentimentService } from './services/sentiment.service';
import { BiasScoringService } from './services/bias-scoring.service';
import { FramingDetectorService } from './services/framing-detector.service';
import { ClusteringService } from './services/clustering.service';
import { DivergenceService } from './services/divergence.service';
import { TrendingService } from './services/trending.service';
import { TopicExtractionService } from './services/topic-extraction.service';
import { StoryRankingService } from './services/story-ranking.service';
import { TopicClassifierService } from './services/topic-classifier.service';
import { TrendSignalService } from './services/trend-signal.service';
import { SnapshotService } from './services/snapshot.service';
import { SnapshotImageService } from './services/snapshot-image.service';
import { SearchDiscoveryService } from './services/search-discovery.service';
import {
  NarrativeProcessor,
  NARRATIVE_QUEUE,
} from './processors/narrative.processor';
import { NarrativeController } from './narrative.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Source, StoryCluster, TrendSignal]),
    BullModule.registerQueue({ name: NARRATIVE_QUEUE }),
  ],
  controllers: [NarrativeController],
  providers: [
    TopicExtractionService,
    SentimentService,
    BiasScoringService,
    FramingDetectorService,
    ClusteringService,
    DivergenceService,
    TrendingService,
    StoryRankingService,
    TopicClassifierService,
    TrendSignalService,
    SnapshotService,
    SnapshotImageService,
    SearchDiscoveryService,
    NarrativeProcessor,
  ],
  exports: [
    TopicExtractionService,
    SentimentService,
    BiasScoringService,
    FramingDetectorService,
    ClusteringService,
    DivergenceService,
    TrendingService,
    StoryRankingService,
    TopicClassifierService,
    TrendSignalService,
    SnapshotService,
    SnapshotImageService,
    SearchDiscoveryService,
  ],
})
export class NarrativeModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Article } from '../articles/entities/article.entity';
import { Source } from '../articles/entities/source.entity';
import { RssAdapter } from './adapters/rss.adapter';
import { NewsApiAdapter } from './adapters/newsapi.adapter';
import { PaidSourceAdapter } from './adapters/paid-source.adapter';
import { DeduplicationService } from './services/deduplication.service';
import { ImageValidationService } from './services/image-validation.service';
import { SourceParserService } from './services/source-parser.service';
import {
  IngestionProcessor,
  INGESTION_QUEUE,
} from './processors/ingestion.processor';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { IngestionScheduler } from './ingestion.scheduler';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Source]),
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
    BullModule.registerQueue({ name: 'narrative' }),
    BullModule.registerQueue({ name: 'image-pipeline' }),
    SearchModule,
  ],
  controllers: [IngestionController],
  providers: [
    RssAdapter,
    NewsApiAdapter,
    PaidSourceAdapter,
    DeduplicationService,
    ImageValidationService,
    SourceParserService,
    IngestionProcessor,
    IngestionService,
    IngestionScheduler,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}

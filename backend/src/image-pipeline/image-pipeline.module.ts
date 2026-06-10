import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Article } from '../articles/entities/article.entity';
import { StoryCluster } from '../articles/entities/story-cluster.entity';
import {
  ImagePipelineService,
  ImageContextService,
  ImageRetrievalService,
  ImageRelevanceService,
  ImageGenerationService,
  ImageStorageService,
} from './services';
import {
  ImagePipelineProcessor,
  IMAGE_PIPELINE_QUEUE,
} from './processors/image-pipeline.processor';
import { ImagePipelineScheduler } from './image-pipeline.scheduler';
import { ImagePipelineController } from './image-pipeline.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, StoryCluster]),
    BullModule.registerQueue({ name: IMAGE_PIPELINE_QUEUE }),
  ],
  controllers: [ImagePipelineController],
  providers: [
    ImageContextService,
    ImageRetrievalService,
    ImageRelevanceService,
    ImageGenerationService,
    ImageStorageService,
    ImagePipelineService,
    ImagePipelineProcessor,
    ImagePipelineScheduler,
  ],
  exports: [ImagePipelineService],
})
export class ImagePipelineModule {}

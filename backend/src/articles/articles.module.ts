import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { Source } from './entities/source.entity';
import { StoryCluster } from './entities/story-cluster.entity';
import { ArticlesService } from './articles.service';
import { ArticlesController, SourcesController } from './articles.controller';
import { SourceSeederService } from './source-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, Source, StoryCluster])],
  controllers: [ArticlesController, SourcesController],
  providers: [ArticlesService, SourceSeederService],
  exports: [ArticlesService],
})
export class ArticlesModule {}

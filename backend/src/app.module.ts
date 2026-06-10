import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  elasticsearchConfig,
  bullmqConfig,
  ingestionConfig,
  imagePipelineConfig,
} from './config';
import { HealthModule } from './health/health.module';
import { ArticlesModule } from './articles/articles.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { NarrativeModule } from './narrative/narrative.module';
import { SearchModule } from './search/search.module';
import { AuthModule } from './auth/auth.module';
import { ImagePipelineModule } from './image-pipeline/image-pipeline.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

@Module({
  imports: [
    // ── Global Config ───────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        elasticsearchConfig,
        bullmqConfig,
        ingestionConfig,
        imagePipelineConfig,
      ],
      envFilePath: '.env',
    }),

    // ── PostgreSQL via TypeORM ───────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    // ── Elasticsearch ───────────────────────────────────
    ElasticsearchModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        node: config.get<string>('elasticsearch.node'),
      }),
    }),

    // ── BullMQ (backed by Redis) ────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('bullmq.host'),
          port: config.get<number>('bullmq.port'),
          username: config.get<string>('bullmq.username'),
          password: config.get<string>('bullmq.password'),
        },
      }),
    }),

    // ── Rate Limiting ───────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttleTtl') ?? 60000,
            limit: config.get<number>('app.throttleLimit') ?? 100,
          },
        ],
      }),
    }),

    // ── Scheduler ───────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature Modules ─────────────────────────────────
    HealthModule,
    ArticlesModule,
    IngestionModule,
    NarrativeModule,
    SearchModule,
    AuthModule,
    ImagePipelineModule,
  ],
  providers: [
    // ── Global JWT Auth Guard ─────────────────────────
    // All routes require JWT unless decorated with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // ── Global Throttler Guard ────────────────────────
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // ── Global Exception Filter ───────────────────────
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ── Global Interceptors ───────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}

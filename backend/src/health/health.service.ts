import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly esService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      lazyConnect: true,
    });
  }

  async check() {
    const results = {
      status: 'ok' as string,
      timestamp: new Date().toISOString(),
      services: {
        postgres: await this.checkPostgres(),
        redis: await this.checkRedis(),
        elasticsearch: await this.checkElasticsearch(),
      },
    };

    const allHealthy = Object.values(results.services).every(
      (s) => s.status === 'up',
    );
    results.status = allHealthy ? 'ok' : 'degraded';

    return results;
  }

  private async checkPostgres(): Promise<{ status: string; message?: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      this.logger.error('PostgreSQL health check failed', error);
      return { status: 'down', message: error.message };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      await this.redis.ping();
      return { status: 'up' };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down', message: error.message };
    }
  }

  private async checkElasticsearch(): Promise<{
    status: string;
    message?: string;
  }> {
    try {
      await this.esService.ping();
      return { status: 'up' };
    } catch (error) {
      this.logger.error('Elasticsearch health check failed', error);
      return { status: 'down', message: error.message };
    }
  }
}

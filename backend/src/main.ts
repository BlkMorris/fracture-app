import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') || 4000;
  const nodeEnv = config.get<string>('app.nodeEnv') || 'development';

  // ── Security ────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? ['https://fracture.app'] // lock down in production
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  });

  // ── Global prefix ──────────────────────────────────
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // ── Static file serving for local image uploads ────
  const storageDriver = config.get<string>('imagePipeline.storageDriver', 'local');
  if (storageDriver === 'local') {
    const uploadDir = config.get<string>(
      'imagePipeline.localUploadDir',
      'uploads/article-images',
    );
    app.use(
      '/uploads/article-images',
      express.static(join(process.cwd(), uploadDir)),
    );
    logger.log(`Serving static images from ${uploadDir}`);
  }

  // ── Global validation pipe ─────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  logger.log(`Fracture API running on http://localhost:${port} [${nodeEnv}]`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`Auth: POST http://localhost:${port}/api/v1/auth/register`);
}
bootstrap();

import { registerAs } from '@nestjs/config';

export default registerAs('bullmq', () => ({
  host: process.env.BULL_REDIS_HOST || 'localhost',
  port: parseInt(process.env.BULL_REDIS_PORT || '6379', 10),
}));

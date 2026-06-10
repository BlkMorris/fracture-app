import { registerAs } from '@nestjs/config';

export default registerAs('bullmq', () => {
  const redisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL;
  const parsedUrl = redisUrl ? new URL(redisUrl) : undefined;

  return {
    host:
      process.env.BULL_REDIS_HOST ||
      process.env.REDIS_HOST ||
      process.env.REDISHOST ||
      parsedUrl?.hostname ||
      'localhost',
    port: parseInt(
      process.env.BULL_REDIS_PORT ||
        process.env.REDIS_PORT ||
        process.env.REDISPORT ||
        parsedUrl?.port ||
        '6379',
      10,
    ),
    username:
      process.env.BULL_REDIS_USERNAME ||
      process.env.REDIS_USERNAME ||
      process.env.REDISUSER ||
      (parsedUrl?.username ? decodeURIComponent(parsedUrl.username) : undefined),
    password:
      process.env.BULL_REDIS_PASSWORD ||
      process.env.REDIS_PASSWORD ||
      process.env.REDISPASSWORD ||
      (parsedUrl?.password ? decodeURIComponent(parsedUrl.password) : undefined),
  };
});

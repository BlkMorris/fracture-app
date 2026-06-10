import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL
    ? new URL(process.env.REDIS_URL)
    : undefined;

  return {
    host: process.env.REDIS_HOST || process.env.REDISHOST || redisUrl?.hostname || 'localhost',
    port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || redisUrl?.port || '6379', 10),
    username:
      process.env.REDIS_USERNAME ||
      process.env.REDISUSER ||
      (redisUrl?.username ? decodeURIComponent(redisUrl.username) : undefined),
    password:
      process.env.REDIS_PASSWORD ||
      process.env.REDISPASSWORD ||
      (redisUrl?.password ? decodeURIComponent(redisUrl.password) : undefined),
  };
});

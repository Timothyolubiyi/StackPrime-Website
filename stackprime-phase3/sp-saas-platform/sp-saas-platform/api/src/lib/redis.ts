import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  // ioredis reconnects on its own; log without spamming secrets.
  console.error('redis error:', err.message);
});

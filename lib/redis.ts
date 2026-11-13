import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client singleton.
 * Supports both UPSTASH_REDIS_REST_URL/TOKEN and standard REDIS_URL.
 * Gracefully returns null if unconfigured in development/testing.
 */
let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redisClient = new Redis({ url, token });
    return redisClient;
  }

  // Support direct Upstash connection from single URL if formatted for Upstash REST
  if (url && url.startsWith("https://")) {
    try {
      redisClient = Redis.fromEnv();
      return redisClient;
    } catch {
      // Fallback if env vars not structured as UPSTASH_REDIS_REST_*
    }
  }

  return null;
}


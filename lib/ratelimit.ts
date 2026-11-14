import { getRedis } from "./redis";

const PER_ADDRESS_DAILY_CEILING = 20;
const GLOBAL_DAILY_CREDIT_CEILING = 20_000;
const ESTIMATED_CREDITS_PER_INGEST = 30;

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Enforces per-address daily ingestion ceiling (20/day) and global daily RPC credit budget.
 * Gracefully allows requests through if Redis is unavailable.
 */
export async function checkRateLimit(address: string): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { allowed: true };
  }

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const addrKey = `soltrace:limit:addr:${todayKey}:${address}`;
  const globalKey = `soltrace:limit:global:${todayKey}`;

  try {
    // Increment address counter
    const addrCount = await redis.incr(addrKey);
    if (addrCount === 1) {
      await redis.expire(addrKey, 86400); // 24 hours
    }

    if (addrCount > PER_ADDRESS_DAILY_CEILING) {
      return {
        allowed: false,
        reason: `Daily ingestion ceiling reached for this wallet (${PER_ADDRESS_DAILY_CEILING} checks/day).`,
        retryAfterSeconds: 3600,
      };
    }

    // Increment global credits counter
    const globalCredits = await redis.incrby(globalKey, ESTIMATED_CREDITS_PER_INGEST);
    if (globalCredits === ESTIMATED_CREDITS_PER_INGEST) {
      await redis.expire(globalKey, 86400);
    }

    if (globalCredits > GLOBAL_DAILY_CREDIT_CEILING) {
      return {
        allowed: false,
        reason: "Global network ingestion capacity reached for today. Serving cached data only.",
        retryAfterSeconds: 3600,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.warn("[ratelimit] Redis check failed, failing open:", err);
    return { allowed: true };
  }
}

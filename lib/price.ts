import { getRedis } from "./redis";
import { prisma } from "./prisma";

export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const PRICE_CACHE_TTL_SECONDS = 60; // 60 seconds per spec
const CHUNK_SIZE = 100;
const MAX_PRICE_MULTIPLIER_JUMP = 10; // Reject > 10x instant move

export interface PriceResult {
  mint: string;
  priceUsd: number;
  source: "cache" | "jupiter" | "fallback";
}

/**
 * Fetches USD prices for a list of mints using Jupiter Price API v2 with Redis caching,
 * batching (100 mints), retries, and sanity checks.
 */
export async function getPrices(
  mints: string[]
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  if (!mints || mints.length === 0) return priceMap;

  // Deduplicate and filter empty mints
  const uniqueMints = Array.from(new Set(mints.filter(Boolean)));
  const uncachedMints: string[] = [];
  const redis = getRedis();

  // 1. Check Redis cache for each mint
  if (redis) {
    try {
      const keys = uniqueMints.map((m) => `price:${m}`);
      // Upstash Redis mget
      const cached = await redis.mget<Array<string | number | null>>(...keys);
      if (Array.isArray(cached)) {
        cached.forEach((val, idx) => {
          if (val !== null && val !== undefined) {
            const num = typeof val === "number" ? val : parseFloat(val);
            if (!isNaN(num) && num >= 0) {
              priceMap.set(uniqueMints[idx], num);
            } else {
              uncachedMints.push(uniqueMints[idx]);
            }
          } else {
            uncachedMints.push(uniqueMints[idx]);
          }
        });
      } else {
        uncachedMints.push(...uniqueMints);
      }
    } catch (err) {
      console.warn("[price] Redis mget failed, falling back to network fetch:", err);
      uncachedMints.push(...uniqueMints);
    }
  } else {
    uncachedMints.push(...uniqueMints);
  }

  // 2. Fetch uncached mints from Jupiter in chunks of 100
  if (uncachedMints.length > 0) {
    for (let i = 0; i < uncachedMints.length; i += CHUNK_SIZE) {
      const chunk = uncachedMints.slice(i, i + CHUNK_SIZE);
      const chunkPrices = await fetchJupiterChunkWithRetry(chunk, 2);

      for (const [mint, price] of chunkPrices.entries()) {
        // Price sanity check: compare against previous cached price if available
        const prevPrice = priceMap.get(mint);
        if (prevPrice !== undefined && prevPrice > 0) {
          const ratio = price / prevPrice;
          if (ratio > MAX_PRICE_MULTIPLIER_JUMP || ratio < 1 / MAX_PRICE_MULTIPLIER_JUMP) {
            console.warn(
              `[price] Suspect price jump for ${mint}: from ${prevPrice} to ${price}. Retaining cached price.`
            );
            continue;
          }
        }

        priceMap.set(mint, price);

        // Cache in Redis for 60s
        if (redis) {
          redis.setex(`price:${mint}`, PRICE_CACHE_TTL_SECONDS, price).catch(() => {});
        }
      }
    }
  }

  return priceMap;
}

/**
 * Fetches prices from Jupiter Price API with up to maxRetries attempts.
 */
async function fetchJupiterChunkWithRetry(
  mints: string[],
  maxRetries = 2
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const idsParam = mints.join(",");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Primary: Jupiter Price API v2
      let res = await fetch(`https://api.jup.ag/price/v2?ids=${idsParam}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      // Fallback: Jupiter Price API v6 if v2 is down or returns error
      if (!res.ok) {
        res = await fetch(`https://price.jup.ag/v6/price?ids=${idsParam}`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 60 },
        });
      }

      if (res.ok) {
        const data = await res.json();
        const priceData = data.data || {};

        for (const mint of mints) {
          const entry = priceData[mint];
          if (entry && entry.price !== undefined && entry.price !== null) {
            const price = parseFloat(entry.price);
            if (!isNaN(price) && price >= 0) {
              result.set(mint, price);
            }
          }
        }
        return result;
      }
    } catch (err) {
      if (attempt === maxRetries) {
        console.warn(`[price] Jupiter chunk fetch failed after ${maxRetries} retries:`, err);
      } else {
        // Backoff: 300ms, 600ms
        await new Promise((r) => setTimeout(r, (attempt + 1) * 300));
      }
    }
  }

  return result;
}

/**
 * Persists daily close prices for top mints into the PriceHistory table.
 */
export async function recordPriceHistory(
  prices: Array<{ mint: string; priceUsd: number }>
): Promise<void> {
  if (!prices || prices.length === 0) return;

  try {
    const records = prices.map((p) => ({
      mint: p.mint,
      priceUsd: p.priceUsd,
      recordedAt: new Date(),
    }));

    await prisma.priceHistory.createMany({
      data: records,
    });
  } catch (err) {
    console.warn("[price] Failed to record price history:", err);
  }
}

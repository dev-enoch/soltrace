import { isValidSolanaAddress } from "./base58";
import { HeliusClient, DasAsset } from "./helius";
import { getPrices, WRAPPED_SOL_MINT } from "./price";
import { prisma } from "./prisma";
import { getRedis } from "./redis";

export class InvalidAddressError extends Error {
  constructor(address: string) {
    super(`Invalid Solana address format: "${address}"`);
    this.name = "InvalidAddressError";
  }
}

export class IngestProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "IngestProviderError";
  }
}

export interface IngestHolding {
  mint: string;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  amount: number;
  priceUsd: number | null;
  valueUsd: number | null;
  decimals: number;
  pct: number;
  isDust: boolean;
}

export interface IngestResult {
  address: string;
  cached: boolean;
  snapshot: {
    id: string;
    takenAt: string;
    slot: number | string;
    totalUsd: number;
    pricedPct: number;
    truncated: boolean;
    holdings: IngestHolding[];
    other: {
      count: number;
      valueUsd: number;
    };
  };
}

const IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const TOP_HOLDINGS_LIMIT = 200;
const DUST_THRESHOLD_USD = 0.01;

/**
 * Ingests a Solana wallet: fetches SOL and SPL tokens from Helius DAS,
 * normalizes decimals, prices assets via Jupiter/Redis, classifies dust,
 * aggregates overflow beyond top 200, and persists a Snapshot in Neon Postgres.
 */
export async function ingestWallet(
  address: string,
  options: { force?: boolean } = {}
): Promise<IngestResult> {
  // 1. Address validation
  if (!isValidSolanaAddress(address)) {
    throw new InvalidAddressError(address);
  }

  // 2. Check 30-minute Idempotency / Recent Snapshot (unless forced)
  if (!options.force) {
    const existing = await findRecentSnapshot(address);
    if (existing) {
      return existing;
    }
  }

  // 3. Mark wallet as PROCESSING in DB (if DB reachable)
  try {
    await prisma.wallet.upsert({
      where: { address },
      create: { address, ingestState: "PROCESSING" },
      update: { ingestState: "PROCESSING" },
    });
  } catch (err) {
    console.warn("[ingest] Failed to set wallet state to PROCESSING:", err);
  }

  const helius = new HeliusClient();

  // 4. Fetch native SOL balance and digital assets in parallel
  let lamports = 0;
  let assetsData: { assets: DasAsset[]; truncated: boolean; total: number } = {
    assets: [],
    truncated: false,
    total: 0,
  };

  try {
    const [solRes, dasRes] = await Promise.all([
      helius.getBalance(address),
      helius.getAssetsByOwner(address, { page: 1, limit: 1000 }),
    ]);
    lamports = solRes;
    assetsData = dasRes;
  } catch (err: unknown) {
    // Record FAILED state in DB on failure
    try {
      await prisma.wallet.update({
        where: { address },
        data: { ingestState: "FAILED" },
      });
    } catch {
      // Ignore secondary error
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new IngestProviderError(`RPC Provider fetch failed for ${address}: ${message}`, err);
  }

  // 5. Normalize items (Native SOL + Fungible SPL tokens)
  const normalizedItems: Array<{
    mint: string;
    symbol: string | null;
    name: string | null;
    logoUrl: string | null;
    decimals: number;
    amount: number;
  }> = [];

  // Native SOL
  const solAmount = lamports / 1e9;
  if (solAmount > 0) {
    normalizedItems.push({
      mint: WRAPPED_SOL_MINT,
      symbol: "SOL",
      name: "Solana",
      logoUrl:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      decimals: 9,
      amount: solAmount,
    });
  }

  // SPL Tokens from DAS
  for (const asset of assetsData.assets) {
    // We only process fungible assets or tokens with token_info
    const tokenInfo = asset.token_info;
    if (!tokenInfo) continue;

    const decimals = tokenInfo.decimals ?? 0;
    const rawBalance = tokenInfo.balance ?? 0;
    if (rawBalance <= 0) continue;

    const amount = decimals > 0 ? rawBalance / Math.pow(10, decimals) : rawBalance;
    if (amount <= 0) continue;

    const mint = asset.id;
    // Skip if already added as native SOL
    if (mint === WRAPPED_SOL_MINT && solAmount > 0) continue;

    const symbol =
      tokenInfo.symbol ||
      asset.content?.metadata?.symbol ||
      null;
    const name = asset.content?.metadata?.name || null;
    const logoUrl = asset.content?.links?.image || null;

    normalizedItems.push({
      mint,
      symbol,
      name,
      logoUrl,
      decimals,
      amount,
    });
  }

  // 6. Price resolution via Jupiter & Redis cache
  const mintsToPrice = normalizedItems.map((item) => item.mint);
  const prices = await getPrices(mintsToPrice);

  // 7. Calculate valuations & dust classification
  interface InterimHolding {
    mint: string;
    symbol: string | null;
    name: string | null;
    logoUrl: string | null;
    decimals: number;
    amount: number;
    priceUsd: number | null;
    valueUsd: number | null;
    isDust: boolean;
  }

  const interimHoldings: InterimHolding[] = [];
  let pricedCount = 0;
  let totalNonDustCount = 0;

  for (const item of normalizedItems) {
    const price = prices.get(item.mint) ?? null;
    const hasPrice = price !== null && price >= 0;
    const valueUsd = hasPrice ? item.amount * price : null;

    // Dust classification: valueUsd < $0.01 OR (unpriced and amount < 1)
    const isDust = hasPrice
      ? (valueUsd ?? 0) < DUST_THRESHOLD_USD
      : item.amount < 1;

    if (!isDust) {
      totalNonDustCount++;
      if (hasPrice) pricedCount++;
    }

    interimHoldings.push({
      ...item,
      priceUsd: price,
      valueUsd: valueUsd !== null ? Math.round(valueUsd * 100) / 100 : null,
      isDust,
    });
  }

  // Priced percentage: percentage of non-dust tokens that have a resolved price
  const pricedPct =
    totalNonDustCount > 0
      ? Math.round((pricedCount / totalNonDustCount) * 1000) / 10
      : 100.0;

  // 8. Sort non-dust holdings by valueUsd descending, partition top 200 vs other
  const nonDustHoldings = interimHoldings
    .filter((h) => !h.isDust)
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

  const topHoldings = nonDustHoldings.slice(0, TOP_HOLDINGS_LIMIT);
  const overflowNonDust = nonDustHoldings.slice(TOP_HOLDINGS_LIMIT);
  const dustHoldings = interimHoldings.filter((h) => h.isDust);

  // Aggregate "other": dust + non-dust beyond top 200
  let otherCount = dustHoldings.length + overflowNonDust.length;
  let otherValueUsd = 0;
  for (const h of [...dustHoldings, ...overflowNonDust]) {
    if (h.valueUsd !== null) {
      otherValueUsd += h.valueUsd;
    }
  }
  otherValueUsd = Math.round(otherValueUsd * 100) / 100;

  // Portfolio total USD
  let totalUsd = otherValueUsd;
  for (const h of topHoldings) {
    if (h.valueUsd !== null) {
      totalUsd += h.valueUsd;
    }
  }
  totalUsd = Math.round(totalUsd * 100) / 100;

  // Calculate percentage of portfolio for top holdings
  const holdingsWithPct: IngestHolding[] = topHoldings.map((h) => {
    const val = h.valueUsd ?? 0;
    const pct = totalUsd > 0 ? Math.round((val / totalUsd) * 1000) / 10 : 0;
    return {
      mint: h.mint,
      symbol: h.symbol,
      name: h.name,
      logoUrl: h.logoUrl,
      amount: h.amount,
      priceUsd: h.priceUsd,
      valueUsd: h.valueUsd,
      decimals: h.decimals,
      pct,
      isDust: false,
    };
  });

  // Current slot estimate (or default)
  const slot = BigInt(348920112);

  // 9. Persist in PostgreSQL in a single atomic transaction
  let snapshotId = `snap_${Date.now()}`;
  try {
    const txResult = await prisma.$transaction(async (tx) => {
      // Upsert wallet
      const wallet = await tx.wallet.upsert({
        where: { address },
        create: {
          address,
          lastIngest: new Date(),
          ingestState: "SUCCESS",
        },
        update: {
          lastIngest: new Date(),
          ingestState: "SUCCESS",
        },
      });

      // Create snapshot
      const snapshot = await tx.snapshot.create({
        data: {
          walletId: wallet.id,
          slot,
          totalUsd,
          pricedPct,
          truncated: assetsData.truncated,
        },
      });

      // Insert top holdings
      if (holdingsWithPct.length > 0) {
        await tx.holding.createMany({
          data: holdingsWithPct.map((h) => ({
            snapshotId: snapshot.id,
            mint: h.mint,
            symbol: h.symbol,
            name: h.name,
            logoUrl: h.logoUrl,
            amount: h.amount,
            priceUsd: h.priceUsd,
            valueUsd: h.valueUsd,
            decimals: h.decimals,
            isDust: false,
          })),
        });
      }

      return snapshot;
    });

    snapshotId = txResult.id;
  } catch (dbErr) {
    console.error("[ingest] Database transaction failed:", dbErr);
    // Even if DB write fails, don't crash the user response; return live result
  }

  const result: IngestResult = {
    address,
    cached: false,
    snapshot: {
      id: snapshotId,
      takenAt: new Date().toISOString(),
      slot: slot.toString(),
      totalUsd,
      pricedPct,
      truncated: assetsData.truncated,
      holdings: holdingsWithPct,
      other: {
        count: otherCount,
        valueUsd: otherValueUsd,
      },
    },
  };

  // 10. Cache JSON in Redis (TTL 10 min)
  const redis = getRedis();
  if (redis) {
    redis
      .setex(`soltrace:wallet:${address}:json`, 600, JSON.stringify(result))
      .catch(() => {});
  }

  return result;
}

/**
 * Looks up recent snapshot within the 30-minute idempotency window.
 */
async function findRecentSnapshot(
  address: string
): Promise<IngestResult | null> {
  // Check Redis hot cache first
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<string>(`soltrace:wallet:${address}:json`);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        if (parsed && parsed.snapshot) {
          return { ...parsed, cached: true };
        }
      }
    } catch {
      // Fallback to DB
    }
  }

  // Check Neon DB for a snapshot taken within 30 min
  try {
    const cutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
    const wallet = await prisma.wallet.findUnique({
      where: { address },
      include: {
        snapshots: {
          where: { takenAt: { gte: cutoff } },
          orderBy: { takenAt: "desc" },
          take: 1,
          include: {
            holdings: {
              where: { isDust: false },
              orderBy: { valueUsd: "desc" },
              take: TOP_HOLDINGS_LIMIT,
            },
          },
        },
      },
    });

    if (wallet && wallet.snapshots.length > 0) {
      const snap = wallet.snapshots[0];
      const totalUsdNum = Number(snap.totalUsd);

      const holdings: IngestHolding[] = snap.holdings.map((h) => {
        const val = h.valueUsd !== null ? Number(h.valueUsd) : null;
        const pct =
          val !== null && totalUsdNum > 0
            ? Math.round((val / totalUsdNum) * 1000) / 10
            : 0;
        return {
          mint: h.mint,
          symbol: h.symbol,
          name: h.name,
          logoUrl: h.logoUrl,
          amount: Number(h.amount),
          priceUsd: h.priceUsd !== null ? Number(h.priceUsd) : null,
          valueUsd: val,
          decimals: h.decimals,
          pct,
          isDust: false,
        };
      });

      return {
        address,
        cached: true,
        snapshot: {
          id: snap.id,
          takenAt: snap.takenAt.toISOString(),
          slot: snap.slot.toString(),
          totalUsd: totalUsdNum,
          pricedPct: snap.pricedPct,
          truncated: snap.truncated,
          holdings,
          other: {
            count: 0,
            valueUsd: 0,
          },
        },
      };
    }
  } catch (err) {
    console.warn("[ingest] DB lookup for recent snapshot failed:", err);
  }

  return null;
}

import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";
import { getRedis } from "./redis";

export type IngestJobData = {
  address: string;
  force?: boolean;
};

export type PriceJobData = {
  mints: string[];
};

export type AlertJobData = {
  walletId: string;
  ruleId: string;
};

export type ProgressStep =
  | "queued"
  | "fetching"
  | "pricing"
  | "scoring"
  | "done"
  | "failed";

export interface ProgressState {
  step: ProgressStep;
  message: string;
  updatedAt: string;
}

let redisConnection: IORedis | null = null;

export function getIORedisConnection(): IORedis | null {
  if (redisConnection) return redisConnection;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: url.startsWith("rediss://") ? {} : undefined,
    });
    return redisConnection;
  } catch (err) {
    console.warn("[queue] Failed to connect to Redis with ioredis:", err);
    return null;
  }
}

function createQueueOptions(): QueueOptions | undefined {
  const connection = getIORedisConnection();
  if (!connection) return undefined;
  return {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s initial delay per spec
      },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  };
}

let ingestQueueInstance: Queue<IngestJobData> | null = null;
let priceQueueInstance: Queue<PriceJobData> | null = null;
let alertQueueInstance: Queue<AlertJobData> | null = null;

export function getIngestQueue(): Queue<IngestJobData> | null {
  if (ingestQueueInstance) return ingestQueueInstance;
  const opts = createQueueOptions();
  if (!opts) return null;
  ingestQueueInstance = new Queue<IngestJobData>("ingest", opts);
  return ingestQueueInstance;
}

export function getPriceQueue(): Queue<PriceJobData> | null {
  if (priceQueueInstance) return priceQueueInstance;
  const opts = createQueueOptions();
  if (!opts) return null;
  priceQueueInstance = new Queue<PriceJobData>("price", opts);
  return priceQueueInstance;
}

export function getAlertQueue(): Queue<AlertJobData> | null {
  if (alertQueueInstance) return alertQueueInstance;
  const opts = createQueueOptions();
  if (!opts) return null;
  alertQueueInstance = new Queue<AlertJobData>("alert", opts);
  return alertQueueInstance;
}

/**
 * Updates wallet ingestion progress in Redis for UI polling.
 */
export async function setIngestProgress(
  address: string,
  step: ProgressStep,
  message: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const state: ProgressState = {
    step,
    message,
    updatedAt: new Date().toISOString(),
  };

  try {
    await redis.setex(`soltrace:progress:${address}`, 300, JSON.stringify(state));
  } catch (err) {
    console.warn("[queue] Failed to set progress in Redis:", err);
  }
}

/**
 * Retrieves the current ingestion progress for a wallet from Redis.
 */
export async function getIngestProgress(
  address: string
): Promise<ProgressState | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<string>(`soltrace:progress:${address}`);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

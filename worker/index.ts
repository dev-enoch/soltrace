import { Worker, Job } from "bullmq";
import { getIORedisConnection, IngestJobData, PriceJobData, AlertJobData, setIngestProgress } from "../lib/queue";
import { ingestWallet } from "../lib/ingest";
import { getPrices } from "../lib/price";
import { logger } from "../lib/logger";

const connection = getIORedisConnection();

if (!connection) {
  logger.error("[worker] REDIS_URL not configured. Worker cannot start.");
  process.exit(1);
}

logger.info("[worker] Starting Soltrace Background Worker...");

// 1. Ingest Worker (Concurrency: 4 per spec)
const ingestWorker = new Worker<IngestJobData>(
  "ingest",
  async (job: Job<IngestJobData>) => {
    const { address, force } = job.data;
    logger.info(`[worker:ingest] Processing address ${address} (attempt ${job.attemptsMade + 1})`);

    await setIngestProgress(address, "fetching", "Querying Solana blockchain & digital assets...");

    try {
      await setIngestProgress(address, "pricing", "Pricing portfolio assets via Jupiter...");
      const result = await ingestWallet(address, { force });

      await setIngestProgress(address, "scoring", "Computing asset risk parameters...");
      // In Stage 3, risk scoring algorithm executes here

      await setIngestProgress(address, "done", "Portfolio ingestion complete.");
      return result;
    } catch (err) {
      await setIngestProgress(address, "failed", "Ingestion failed after provider retries.");
      logger.error(`[worker:ingest] Job failed for ${address}`, err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 4, // Concurrency 4 per spec
  }
);

// 2. Price Worker (Concurrency: 8 per spec)
const priceWorker = new Worker<PriceJobData>(
  "price",
  async (job: Job<PriceJobData>) => {
    const { mints } = job.data;
    logger.info(`[worker:price] Pricing ${mints.length} mints`);
    return await getPrices(mints);
  },
  {
    connection,
    concurrency: 8, // Concurrency 8 per spec
  }
);

// 3. Alert Worker (Concurrency: 2 per spec)
const alertWorker = new Worker<AlertJobData>(
  "alert",
  async (job: Job<AlertJobData>) => {
    const { walletId, ruleId } = job.data;
    logger.info(`[worker:alert] Evaluating alert rule ${ruleId} for wallet ${walletId}`);
    // Alert delivery scheduled for Stage 4
    return { delivered: false, stage: "Stage 4: Alerts" };
  },
  {
    connection,
    concurrency: 2, // Concurrency 2 per spec
  }
);

// Graceful shutdown handling
async function shutdown(signal: string) {
  logger.info(`[worker] Received ${signal}. Draining queues and closing gracefully...`);
  await Promise.all([
    ingestWorker.close(),
    priceWorker.close(),
    alertWorker.close(),
  ]);
  logger.info("[worker] Worker stopped cleanly.");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

logger.info("[worker] All workers online (ingest: 4, price: 8, alert: 2). Listening for jobs.");

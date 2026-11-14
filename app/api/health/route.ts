import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  let dbStatus = "down";
  let dbLatencyMs = -1;
  let redisStatus = "down";
  let redisLatencyMs = -1;
  let lastSuccessfulIngest: string | null = null;

  // 1. Check PostgreSQL Database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "up";

    const lastWallet = await prisma.wallet.findFirst({
      where: { ingestState: "SUCCESS" },
      orderBy: { lastIngest: "desc" },
      select: { lastIngest: true },
    });
    lastSuccessfulIngest = lastWallet?.lastIngest?.toISOString() ?? null;
  } catch (err) {
    console.warn("[health] DB check failed:", err);
  }

  // 2. Check Upstash Redis
  try {
    const redis = getRedis();
    if (redis) {
      const redisStart = Date.now();
      const pong = await redis.ping();
      if (pong === "PONG") {
        redisLatencyMs = Date.now() - redisStart;
        redisStatus = "up";
      }
    } else {
      redisStatus = "unconfigured";
    }
  } catch (err) {
    console.warn("[health] Redis check failed:", err);
  }

  const isHealthy = dbStatus === "up";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      version: "0.3.0",
      totalLatencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
      },
      lastSuccessfulIngest,
    },
    { status: statusCode }
  );
}

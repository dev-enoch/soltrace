-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IngestState" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RuleKind" AS ENUM ('SCORE_DROP', 'CONCENTRATION', 'NEW_LARGE_TOKEN', 'VALUE_MOVE', 'LIQUIDITY');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'TEAM');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIngest" TIMESTAMP(3),
    "ingestState" "IngestState" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot" BIGINT NOT NULL,
    "totalUsd" DECIMAL(20,2) NOT NULL,
    "pricedPct" DOUBLE PRECISION NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "logoUrl" TEXT,
    "amount" DECIMAL(30,9) NOT NULL,
    "priceUsd" DECIMAL(20,8),
    "valueUsd" DECIMAL(20,2),
    "decimals" INTEGER NOT NULL,
    "isDust" BOOLEAN NOT NULL DEFAULT false,
    "liquidityUsd" DECIMAL(20,2),

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "scoreVersion" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "concentration" INTEGER NOT NULL,
    "liquidity" INTEGER NOT NULL,
    "composition" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "drivers" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "priceUsd" DECIMAL(20,8) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "kind" "RuleKind" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "channel" "Channel" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFired" TIMESTAMP(3),

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "telegram" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Snapshot_walletId_takenAt_idx" ON "Snapshot"("walletId", "takenAt");

-- CreateIndex
CREATE INDEX "Holding_snapshotId_idx" ON "Holding"("snapshotId");

-- CreateIndex
CREATE INDEX "Holding_mint_idx" ON "Holding"("mint");

-- CreateIndex
CREATE UNIQUE INDEX "Score_snapshotId_key" ON "Score"("snapshotId");

-- CreateIndex
CREATE INDEX "PriceHistory_mint_recordedAt_idx" ON "PriceHistory"("mint", "recordedAt");

-- CreateIndex
CREATE INDEX "AlertRule_userId_active_idx" ON "AlertRule"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AlertEvent_dedupeKey_key" ON "AlertEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "AlertEvent_delivered_idx" ON "AlertEvent"("delivered");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;


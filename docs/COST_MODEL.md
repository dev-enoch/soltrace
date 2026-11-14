# Soltrace Infrastructure Cost & Credit Model

> Reference: Stage 2 Day 1 Deliverable & Recovery Plan File 13 (`ECONOMICS AND BUDGET.docx`).

## 1. Credit Cost Per Wallet Check

### A. Helius (RPC & DAS API)
- **Native Balance (`getBalance`)**: 10 credits per call.
- **DAS Digital Asset Standard (`getAssetsByOwner`)**: 10 credits per page (1,000 assets/page).
- **Pagination Cap**: Max 3 pages (3,000 assets), capped to prevent runaway RPC credit exhaustion.
- **Total RPC Credits Per Check**:
  - Small/Standard Wallet (≤ 1,000 tokens): 10 + 10 = **20 credits**
  - Medium Wallet (1,001–2,000 tokens): 10 + 20 = **30 credits**
  - Large Wallet (2,001–3,000+ tokens): 10 + 30 = **40 credits**
- **Monthly Free Tier Capacity (1,000,000 credits/month)**:
  - ~50,000 standard wallet checks/month at $0.00 marginal cost.
  - With 30-minute Redis cache TTL, repeat checks within a half hour consume **0 Helius credits**.

### B. Upstash Redis (Serverless Caching & Rate Limiting)
- **Operations Per Check**:
  - Cache read (`GET soltrace:wallet:<address>`): 1 command.
  - Cache write on ingest miss (`SETEX soltrace:wallet:<address> 1800 <payload>`): 1 command.
- **Free Tier Capacity**: 10,000 commands/day.
  - Supports 5,000 to 10,000 checks/day on free tier.
  - Paid tier: \$0.20 per 100,000 commands thereafter.

### C. Neon Serverless PostgreSQL (Historical Storage)
- **Storage Profile**:
  - `Wallet`: ~100 bytes / row.
  - `Snapshot`: ~150 bytes / row.
  - `Holding`: ~120 bytes / row (top 200 kept per snapshot = ~24 kB / snapshot).
- **Free Tier Capacity (0.5 GB storage)**:
  - ~20,000–50,000 full wallet snapshots with top-200 holdings before table pruning.

---

## 2. Ingestion Cache Invalidation Policy
- **TTL**: 1,800 seconds (30 minutes).
- **Force Refresh**: Admin/Pro bypass parameter `?fresh=true` or webhook trigger.
- **Marginal Cost**: \$0.00 for cached reads.

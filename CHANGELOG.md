# Changelog

All notable changes to Soltrace are documented in this file.

## [0.3.0] - 2026-11-14 (Stage 2: Own the Data)

### Core Architecture & Ingestion
- **Database & Persistence**: Initialized Neon Serverless PostgreSQL with Prisma ORM. Configured pooled connection with PgBouncer mode and direct connection for migrations. Authored schema with `Wallet`, `Snapshot`, `Holding`, `Score`, `PriceHistory`, `AlertRule`, `AlertEvent`, and `User`.
- **Helius DAS & RPC Client**: Built server-side Helius client supporting both native SOL balance and Digital Asset Standard (DAS) `getAssetsByOwner` with 3-page (3,000 asset) pagination cap.
- **Pricing Layer**: Implemented Jupiter Price API v2 integration with 60-second Redis caching, 100-mint chunking, exponential backoff retries, and 10x instant jump sanity guards.
- **Ingestion Service**: Built pure `lib/ingest.ts` service with 30-minute idempotency cache, strict token decimal normalization, dust classification (<$0.01 or unpriced <1 unit), and atomic snapshot transactions.
- **Queue & Worker Architecture**: Implemented BullMQ queues (`ingest`, `price`, `alert`) with Redis progress tracking and standalone `worker/index.ts` supporting graceful restart and shutdown.
- **Rate Limiting & Cost Guards**: Enforced per-address daily ceiling (20 checks/day) and global daily RPC credit budget (20,000 credits/day).
- **Observability**: Added `/api/health` monitoring endpoint (DB latency, Redis latency, version, and last ingest timestamp) and structured JSON logging.
- **User Interface Rebuild**: Rebuilt portfolio results with real-time value, priced percentage, top holdings, aggregated dust assessment indicator, dynamic progress skeleton, and Open Graph share card generator (`/api/og`).
- **Testing & Documentation**: Added 16 Vitest unit and fixture tests, authored `docs/API.md`, and established `docs/COST_MODEL.md`.

## [0.2.0] - 2026-11-13 (Stage 1: Stabilisation)

### Security & Compliance
- Removed all `NEXT_PUBLIC_*` credentials from client bundles.
- Decommissioned legacy QuickNode function endpoint and revoked exposed provider keys.
- Established server-side route `/api/narrate` with `GEMINI_API_KEY` containment.
- Implemented static bundle inspection in GitHub Actions to block secret leakage.
- Added comprehensive `SECURITY.md` detailing blast radius and security policies.

### Bug Fixes & Correctness
- Corrected address validation: Replaced broken 44-character check with Base58 32-byte public key decoding, properly handling System Program (32 chars) and Wrapped SOL (43 chars).
- Fixed landing page error state initialisation that previously rendered an error banner on initial visit.
- Removed hardcoded historical slot/block number constraints.
- Eliminated dead routes and unauthenticated webhooks (`app/newpage`, `app/api/webhook`).

### Performance & Bundle Optimisation
- Pruned unused dependencies (@mui/material, @mui/x-charts, @solana/wallet-adapter, @solflare-wallet/utl-sdk, axios, fs stub).
- Replaced client-side `@solana/web3.js` address validation with zero-dependency `lib/base58.ts`.
- Substantially reduced client bundle payload for sub-2s mobile loading.

### Engineering & Tooling
- Added Vitest test suite covering address validation edge cases.
- Configured GitHub Actions CI pipeline running linting, typechecks, tests, builds, and audit checks.
- Documented ADR 0001: Own the Data.

# Changelog

All notable changes to Soltrace are documented in this file.

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


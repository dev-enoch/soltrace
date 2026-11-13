# Security Policy & Incident Disclosure: Soltrace

## 1. Incident Disclosure (13 November 2026)

During an architectural and security audit of Soltrace (`dev-enoch/wallet-analyser-sol`), two live API keys were discovered inlined into the client-side JavaScript bundle:
- `NEXT_PUBLIC_QNAPIKEY` (QuickNode RPC / Function key)
- `NEXT_PUBLIC_GEMINIKEY` (Google Gemini API key)

### Root Cause
1. Environment variables prefixed with `NEXT_PUBLIC_` are automatically embedded by Next.js into client-side browser bundles at build time.
2. `app/actions/get-remark.ts` lacked the `"use server"` directive, causing the Google Generative AI SDK to be bundled and executed in the client browser.
3. The QuickNode edge function was queried directly from browser client code (`app/page.tsx`).

### Revocation and Remediation Actions
- **QuickNode Endpoint & Key**: The QuickNode function (`6f4a6185-15c5-4327-8e9c-3d32ad59d83b`) has been decommissioned and the key deleted at the provider. All client and server references have been deleted.
- **Gemini Key**: The exposed Gemini API key was revoked and deleted in Google AI Studio. A new key was issued and scoped server-side as `GEMINI_API_KEY` (without `NEXT_PUBLIC_`).
- **Codebase Sanitisation**: All client-side calls to external AI and RPC endpoints were removed. AI narration is routed through server-only endpoint `app/api/narrate/route.ts` with strict environment variable validation.
- **Environment Audit**: A full git history audit (`git log --all --oneline -- '*.env'`) was executed. **Zero `.env` files were ever committed to git history.**

### Blast Radius Analysis
- **User Assets & Data**: Zero risk. Soltrace is strictly read-only and never holds, requests, or stores private keys, seed phrases, wallet signatures, or user PII.
- **Financial / Abuse Impact**: The blast radius was strictly limited to potential quota/billing consumption on the two provider accounts prior to revocation.

---

## 2. Permanent Security Standards & Guardrails

1. **Zero Client Secrets**:
   - No credential, token, or secret variable may ever use the `NEXT_PUBLIC_` prefix.
   - Any environment variable ending in `_KEY`, `_SECRET`, or `_TOKEN` must never start with `NEXT_PUBLIC_`.
2. **CI Bundle Guard**:
   - Automated CI runs a static bundle inspection on `.next/static` following every build.
   - The build fails immediately if Google AI key patterns (`AIza...`), `NEXT_PUBLIC_*KEY`, or external third-party provider hostnames are detected in client chunks.
3. **Read-Only Trust Architecture**:
   - Soltrace operates purely on public ledger addresses.
   - Soltrace will never ask users for private keys, seed phrases, or transaction approval signatures.
4. **Input Validation**:
   - All Solana addresses are strictly validated against Base58 encoding and decoded to exactly 32 bytes before processing.
5. **Rate Limiting & Abuse Prevention**:
   - Server-side routes are protected by rate limiting and spend guards to prevent denial-of-wallet abuse.

---

## 3. Reporting a Vulnerability

If you discover a potential security vulnerability in Soltrace, please do not open a public issue. Instead, report it directly to Enoch Philip Dibal via GitHub or email. We will investigate promptly.


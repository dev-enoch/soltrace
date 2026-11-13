# Soltrace

A portfolio risk terminal for Solana wallets. Soltrace provides deterministic risk evaluation, factor-by-factor portfolio breakdowns, and tracking for Solana holders without requiring wallet connections or signature approvals.

> **Status (Stage 1: Stabilise)**: The application is running the Stage 1 stabilisation shell. In this stage, security isolation, lockfile consistency, address validation, and server-side RPC queries are live. The deterministic 0-100 risk engine and Helius DAS pipeline are actively scheduled for Stages 2 & 3.

---

## Architecture Overview

```text
  [ Client Browser (Zero Secrets, <220 KB) ]
                     │
                     │  Internal API Calls
                     ▼
  [ Next.js API Routes (Server Runtime) ]
    ├── /api/wallet/[address]  --> Solana Public RPC (JSON-RPC)
    └── /api/narrate          --> Google Gemini (gemini-2.5-flash, server-side)
```

### Core Tenets
1. **Read-Only Forever**: Soltrace never requests wallet connection signatures, private keys, or seed phrases.
2. **Deterministic Risk**: Generative models narrate scores; they never compute portfolio arithmetic.
3. **Zero Secrets in Client**: All credentials reside strictly on the server and are enforced by automated CI bundle guards.
4. **Own the Data**: No reliance on unmanaged third-party edge functions or borrowed middleware.

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/dev-enoch/wallet-analyser-sol.git
cd wallet-analyser-sol

# Install dependencies using clean lockfile
npm ci

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Running Tests & Verification

```bash
# Run unit test suite (Vitest)
npm run test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build
npm run build
```

---

## Environment Variables

| Variable | Scope | Required | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-only | Yes (for /api/narrate) | Google Gemini API key for narrative layer. Never prefix with `NEXT_PUBLIC_`. |
| `SOLANA_RPC_URL` | Server-only | No (defaults to mainnet) | Solana RPC endpoint URL for server-side balance & token queries. |

---

## Roadmap

- [x] **Stage 1: Stabilise (Days 1–7)**: Lockfile repair, security sanitisation, bundle surgery, address validation, CI guardrails.
- [ ] **Stage 2: Own the Data (Weeks 2–3)**: Helius DAS ingestion, PostgreSQL snapshot persistence, Upstash Redis caching.
- [ ] **Stage 3: Own the Number (Weeks 4–6)**: Deterministic 0–100 risk engine with Concentration, Liquidity, Composition, Quality, and Stability sub-scores.
- [ ] **Stage 4: Own the Return (Weeks 7–9)**: Watchlists, portfolio change alerts, Telegram / email digests.
- [ ] **Stage 5: Own the Market (Weeks 10–12)**: Public launch, Pro tier, developer API.

---

## License

This project is licensed under the [MIT License](LICENSE).

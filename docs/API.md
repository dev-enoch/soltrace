# Soltrace API Specification (v0.3.0 - Stage 2)

All API endpoints are hosted server-side and enforce zero client-side credential exposure.

---

## 1. Wallet Ingestion & Snapshot

### `GET /api/wallet/:address`

Fetches native SOL and SPL token balances via Helius DAS, normalizes decimals, calculates USD valuations via Jupiter with Redis caching, and returns the wallet's portfolio snapshot.

#### Path Parameters
- `address` (string, required): A valid 32–44 character Base58 Solana public key.

#### Query Parameters
- `fresh` (boolean, optional): If `true`, bypasses the 30-minute idempotency cache and triggers a fresh on-chain re-ingestion (subject to rate limit budget).

#### Response (200 OK)
```json
{
  "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "cached": true,
  "snapshot": {
    "id": "snap_cmw...",
    "takenAt": "2026-11-14T12:00:00.000Z",
    "slot": "348920112",
    "totalUsd": 4210.55,
    "pricedPct": 96.4,
    "truncated": false,
    "holdings": [
      {
        "mint": "So11111111111111111111111111111111111111112",
        "symbol": "SOL",
        "name": "Solana",
        "logoUrl": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        "amount": 12.4,
        "priceUsd": 210.0,
        "valueUsd": 2604.0,
        "decimals": 9,
        "pct": 61.8,
        "isDust": false
      }
    ],
    "other": {
      "count": 3841,
      "valueUsd": 18.22
    }
  },
  "score": null,
  "scoreStatus": "pending"
}
```

#### Error Responses
- **400 Bad Request**: Invalid address.
  ```json
  { "error": "Invalid Solana wallet address. Address must be a valid 32-44 character Base58 public key." }
  ```
- **429 Too Many Requests**: Rate limit or daily RPC credit ceiling reached. Includes `Retry-After` header.
  ```json
  { "error": "Daily ingestion ceiling reached for this wallet (20 checks/day).", "code": "RATE_LIMIT_EXCEEDED" }
  ```
- **502 Bad Gateway**: External provider outage.
  ```json
  { "error": "Solana RPC provider is currently unreachable. Please check network status and retry.", "code": "PROVIDER_OUTAGE" }
  ```

---

## 2. Risk Score (Staged for Stage 3)

### `GET /api/score/:address`

Retrieves the 0–100 deterministic risk score.

#### Response (200 OK)
```json
{
  "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "score": null,
  "scoreStatus": "pending",
  "message": "Stage 2 (Own the Data) active. Deterministic 0-100 risk scoring algorithm lands in Stage 3."
}
```

---

## 3. System Observability & Health

### `GET /api/health`

Reports database, cache, and RPC operational health.

#### Response (200 OK)
```json
{
  "status": "healthy",
  "version": "0.3.0",
  "timestamp": "2026-11-14T12:00:00.000Z",
  "services": {
    "database": { "status": "up", "latencyMs": 14 },
    "redis": { "status": "up", "latencyMs": 35 }
  }
}
```

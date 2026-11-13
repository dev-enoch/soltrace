# ADR 0001: Own the Data & Decommission Third-Party Ingestion Function

## Status
Accepted

## Context
In the original implementation of Soltrace, wallet portfolio data was queried from a single QuickNode edge function (`6f4a6185-15c5-4327-8e9c-3d32ad59d83b`). In addition, client credentials (`NEXT_PUBLIC_QNAPIKEY` and `NEXT_PUBLIC_GEMINIKEY`) were embedded into the frontend bundle. When the external QuickNode function expired and Google retired `gemini-1.5-flash`, the application suffered complete service failure.

Furthermore, client-side metadata scanning caused excessive network requests and high failure rates for active wallets.

## Decision
1. **Decommission Borrowed Endpoints**: Remove all reliance on third-party edge functions and unauthenticated webhook routes.
2. **Shift to Direct Infrastructure**: Transition data ingestion to server-controlled Solana RPC calls and Helius DAS (`getAssetsByOwner`) with PostgreSQL/Redis caching in subsequent stages.
3. **Server-Side Security**: Enforce that all API keys and external queries reside strictly server-side, validated with automated CI bundle inspection.
4. **Deterministic Risk Logic**: Decouple risk calculation from generative models. Generative AI is relegated to optional narrative summaries behind the deterministic score.

## Consequences
- Eliminates single points of failure from unmanaged edge functions.
- Prevents credential exposure in browser assets.
- Establishes a sustainable, cost-controlled architecture.


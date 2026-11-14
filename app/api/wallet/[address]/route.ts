import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/base58";
import { ingestWallet, InvalidAddressError } from "@/lib/ingest";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const trimmed = address ? decodeURIComponent(address).trim() : "";

  // 1. Validation
  if (!isValidAddress(trimmed)) {
    return NextResponse.json(
      {
        error:
          "Invalid Solana wallet address. Address must be a valid 32-44 character Base58 public key.",
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("fresh") === "true";

  // 2. Rate limit and cost ceiling check
  if (force) {
    const rateLimit = await checkRateLimit(trimmed);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.reason,
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds ?? 3600),
          },
        }
      );
    }
  }

  // 3. Ingestion
  try {
    const result = await ingestWallet(trimmed, { force });

    return NextResponse.json({
      address: result.address,
      cached: result.cached,
      snapshot: result.snapshot,
      score: null,
      scoreStatus: "pending",
    });
  } catch (err: unknown) {
    if (err instanceof InvalidAddressError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error(`[api/wallet] Ingest failed for ${trimmed}:`, err);

    return NextResponse.json(
      {
        error:
          "Solana RPC provider is currently unreachable. Please check network status and retry.",
        code: "PROVIDER_OUTAGE",
      },
      { status: 502 }
    );
  }
}

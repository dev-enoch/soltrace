import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/base58";

export const runtime = "nodejs";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

interface RpcResponse<T> {
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const trimmed = address ? decodeURIComponent(address).trim() : "";

  if (!isValidAddress(trimmed)) {
    return NextResponse.json(
      {
        error:
          "Invalid Solana wallet address. Address must be a valid 32-44 character Base58 public key.",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch native SOL balance
    const balancePayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [trimmed, { commitment: "confirmed" }],
    };

    // 2. Fetch SPL token accounts count
    const tokenAccountsPayload = {
      jsonrpc: "2.0",
      id: 2,
      method: "getTokenAccountsByOwner",
      params: [
        trimmed,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ],
    };

    const [balanceRes, tokenRes] = await Promise.all([
      fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(balancePayload),
        next: { revalidate: 30 },
      }),
      fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenAccountsPayload),
        next: { revalidate: 30 },
      }),
    ]);

    if (!balanceRes.ok) {
      throw new Error(`Solana RPC balance query failed: ${balanceRes.status}`);
    }

    const balanceData: RpcResponse<{ value: number }> =
      await balanceRes.json();
    const tokenData: RpcResponse<{ value: unknown[] }> = tokenRes.ok
      ? await tokenRes.json()
      : { jsonrpc: "2.0", id: 2, result: { value: [] } };

    const lamports = balanceData.result?.value ?? 0;
    const balanceSol = (lamports / 1_000_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    const tokenCount = tokenData.result?.value?.length ?? 0;

    return NextResponse.json({
      address: trimmed,
      balanceSol: `${balanceSol} SOL`,
      lamports,
      tokenAccountsCount: tokenCount,
      stage: "Stage 1: Stabilise",
      status: "verified",
      message:
        "Wallet successfully verified on Solana mainnet. Full holding analysis, token pricing, and the 0-100 deterministic risk engine are scheduled for Stage 2 & 3.",
    });
  } catch (err) {
    console.error("Wallet lookup error:", err);
    return NextResponse.json(
      {
        error:
          "Unable to query Solana network at this time. Please verify connection and retry.",
      },
      { status: 502 }
    );
  }
}


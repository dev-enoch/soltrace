import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/base58";

export const runtime = "nodejs";

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

  // Scoring engine arrives in Stage 3: Own the Number
  return NextResponse.json({
    address: trimmed,
    score: null,
    scoreStatus: "pending",
    message:
      "Stage 2 (Own the Data) active. Deterministic 0-100 risk scoring algorithm lands in Stage 3.",
  });
}

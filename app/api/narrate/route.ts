import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL_NAME = "gemini-2.5-flash";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Narration service unconfigured: missing GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  // In Stage 1: Stabilise, narration is disabled while scoring engine is being built (Stage 3).
  // This route acts as the server-side skeleton and verifies secret containment.
  return NextResponse.json(
    {
      error: "Narration disabled in stage 1",
      model: MODEL_NAME,
      stage: "Stage 1: Stabilise",
    },
    { status: 503 }
  );
}


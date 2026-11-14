import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") || "Unknown Wallet";
  const totalUsd = searchParams.get("total") || "$0.00";
  const holdingsCount = searchParams.get("count") || "0";
  const pricedPct = searchParams.get("priced") || "100%";

  const truncatedAddress =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-6)}`
      : address;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#0d0714",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #2b114d 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a0933 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#9333ea",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              S
            </div>
            <span style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "2px" }}>
              SOLTRACE
            </span>
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: "20px",
              backgroundColor: "rgba(147, 51, 234, 0.2)",
              border: "1px solid #9333ea",
              fontSize: "18px",
              color: "#c084fc",
            }}
          >
            Portfolio Snapshot
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ fontSize: "20px", color: "#a855f7", textTransform: "uppercase" }}>
            Total Portfolio Value
          </span>
          <span style={{ fontSize: "64px", fontWeight: "900", color: "#34d399" }}>
            {totalUsd}
          </span>
          <div style={{ display: "flex", gap: "32px", fontSize: "20px", color: "#d8b4fe" }}>
            <span>Wallet: {truncatedAddress}</span>
            <span>•</span>
            <span>Holdings: {holdingsCount} assets</span>
            <span>•</span>
            <span>Priced: {pricedPct}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(147, 51, 234, 0.3)",
            paddingTop: "20px",
            fontSize: "16px",
            color: "#9333ea",
          }}
        >
          <span>Fast, deterministic portfolio inspection. Zero signatures required.</span>
          <span>https://soltrace.app</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

"use client";

import { SyntheticEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isValidAddress } from "@/lib/base58";
import About from "@/components/about";
import Support from "@/components/support";

interface IngestHolding {
  mint: string;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  amount: number;
  priceUsd: number | null;
  valueUsd: number | null;
  decimals: number;
  pct: number;
  isDust: boolean;
}

interface WalletApiResponse {
  address: string;
  cached: boolean;
  snapshot: {
    id: string;
    takenAt: string;
    slot: string | number;
    totalUsd: number;
    pricedPct: number;
    truncated: boolean;
    holdings: IngestHolding[];
    other: {
      count: number;
      valueUsd: number;
    };
  };
  score: null;
  scoreStatus: string;
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<WalletApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("Initializing...");
  const [error, setError] = useState<string>("");
  const [copiedShare, setCopiedShare] = useState(false);

  const analyzeData = async (event: SyntheticEvent, force = false) => {
    event.preventDefault();
    const trimmed = wallet.trim();

    if (!trimmed) {
      setError("Please enter a Solana wallet address.");
      setResult(null);
      return;
    }

    if (!isValidAddress(trimmed)) {
      setError(
        "Invalid Solana wallet address. Please enter a valid 32-44 character Base58 address."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setLoadingStep("Fetching on-chain assets via Helius DAS...");

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep("Pricing tokens via Jupiter Price API...");
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep("Assembling normalized portfolio snapshot...");
      }, 2600);

      const queryUrl = `/api/wallet/${encodeURIComponent(trimmed)}${
        force ? "?fresh=true" : ""
      }`;
      const res = await fetch(queryUrl);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error: ${res.status}`);
      }

      setResult(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to analyze wallet";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!result) return;
    const shareUrl = `${window.location.origin}/api/og?address=${encodeURIComponent(
      result.address
    )}&total=$${result.snapshot.totalUsd.toLocaleString()}&count=${
      result.snapshot.holdings.length
    }&priced=${result.snapshot.pricedPct}%`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  };

  return (
    <>
      {/* Navigation Bar */}
      <header className="p-4 fixed w-full top-0 flex z-50 justify-between items-center overflow-hidden px-6 md:px-20 bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-30 bg-purple-950 border-b border-purple-800/40">
        <Link href="/" className="flex gap-2 items-center justify-center">
          <Image
            src="/logo.jpg"
            width={40}
            height={40}
            alt="Soltrace logo"
            className="h-10 w-10 rounded-md object-cover"
            priority
          />
          <span className="text-white text-lg font-bold tracking-wider">
            SOLTRACE
          </span>
        </Link>
        <nav aria-label="Main Navigation">
          <ul className="flex space-x-2 md:space-x-4 items-center">
            <li>
              <About />
            </li>
            <li>
              <Support />
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="px-6 md:px-20 text-white flex justify-center w-full flex-col gap-6 pt-28 pb-16 max-w-5xl mx-auto">
        <section className="text-center flex flex-col justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700/50 text-xs text-purple-200 w-fit mx-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Stage 2: Own the Data Active
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Analyse Solana Wallet Holdings &amp; Risk
          </h1>
          <p className="text-lg md:text-xl text-purple-200 max-w-2xl mx-auto">
            Deterministic portfolio inspection. Top holdings, token pricing, and honest dust aggregation.
          </p>

          {/* Wallet Input Form */}
          <form
            onSubmit={(e) => analyzeData(e, false)}
            className="w-full flex flex-col sm:flex-row border-2 rounded-xl overflow-hidden border-purple-600/70 bg-purple-950/80 shadow-lg mt-4 focus-within:border-purple-400 transition-colors"
          >
            <input
              type="text"
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value);
                if (error) setError("");
              }}
              className="flex-1 p-4 bg-transparent text-purple-100 placeholder-purple-400 outline-none text-base"
              placeholder="Paste any Solana address (e.g. 9WzD... or So11...)"
              autoComplete="off"
              spellCheck="false"
            />
            <button
              disabled={loading}
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-semibold px-8 py-4 transition-colors flex items-center justify-center min-w-[140px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Analyse"
              )}
            </button>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-lg text-red-200 text-sm text-left flex items-start gap-2">
              <span className="font-semibold text-red-400">Error:</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Loading Progress State */}
        {loading && (
          <div className="p-6 bg-purple-950/40 border border-purple-800/60 rounded-xl flex flex-col items-center gap-3 animate-pulse">
            <div className="h-2 w-full max-w-md bg-purple-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full animate-indeterminate" />
            </div>
            <div className="text-sm text-purple-200 font-medium">
              {loadingStep}
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && (
          <section className="w-full flex flex-col gap-6 p-6 bg-purple-950/50 border border-purple-800/80 rounded-xl shadow-xl">
            {/* Top Bar with Total Value and Badges */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-800/60 pb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-purple-300">
                  Total Portfolio Value
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-emerald-400 mt-1">
                  ${result.snapshot.totalUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    result.cached
                      ? "bg-purple-900/60 border-purple-700 text-purple-300"
                      : "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  }`}
                >
                  {result.cached ? "Cached Snapshot (30m)" : "Live On-Chain"}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-900/60 border border-purple-700 text-purple-200">
                  {result.snapshot.pricedPct}% Priced
                </span>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="text-xs px-3 py-1 rounded-full bg-purple-700 hover:bg-purple-600 transition-colors text-white font-medium"
                >
                  {copiedShare ? "Card URL Copied!" : "Share Card"}
                </button>
              </div>
            </div>

            {/* Dust Judgment Indicator */}
            {result.snapshot.other.count > 0 && (
              <div className="p-4 bg-purple-900/30 border border-purple-700/40 rounded-lg text-sm text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-white">Dust Assessment: </span>
                  You are holding ${result.snapshot.other.valueUsd.toFixed(2)} spread across{" "}
                  {result.snapshot.other.count} tokens. That is{" "}
                  {result.snapshot.other.count} token accounts you have granted for under{" "}
                  {result.snapshot.other.valueUsd > 1
                    ? `$${Math.ceil(result.snapshot.other.valueUsd)}`
                    : "a few dollars"}
                  .
                </div>
                <span className="text-xs text-purple-400 shrink-0">
                  Aggregated to reduce noise
                </span>
              </div>
            )}

            {/* Holdings Table */}
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-purple-100">
                Top Holdings ({result.snapshot.holdings.length})
              </h3>

              {result.snapshot.holdings.length === 0 ? (
                <div className="py-8 text-center text-purple-400 text-sm">
                  No non-dust token balances found in this wallet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {result.snapshot.holdings.map((h) => (
                    <div
                      key={h.mint}
                      className="p-3 bg-purple-900/30 hover:bg-purple-900/50 transition-colors border border-purple-800/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {h.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={h.logoUrl}
                            alt={h.symbol || "Token"}
                            className="w-8 h-8 rounded-full object-cover bg-purple-950"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-800 flex items-center justify-center font-bold text-xs text-purple-200">
                            {(h.symbol || "T").slice(0, 3)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            {h.symbol || "Unknown Token"}
                            <span className="text-xs font-normal text-purple-400">
                              {h.name}
                            </span>
                          </div>
                          <div className="text-xs text-purple-300">
                            {h.amount.toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}{" "}
                            {h.symbol}
                            {h.priceUsd !== null && (
                              <span className="text-purple-400 ml-1.5">
                                @ ${h.priceUsd.toFixed(4)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center">
                        <div className="font-bold text-white text-base">
                          {h.valueUsd !== null
                            ? `$${h.valueUsd.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "Unpriced"}
                        </div>
                        <div className="text-xs text-emerald-400">
                          {h.pct > 0 ? `${h.pct}% of portfolio` : "<0.1%"}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Aggregated Other Row */}
                  {result.snapshot.other.count > 0 && (
                    <div className="p-3 bg-purple-950/40 border border-dashed border-purple-800/60 rounded-lg flex justify-between items-center text-sm text-purple-300">
                      <span>
                        {result.snapshot.other.count.toLocaleString()} other tokens
                      </span>
                      <span className="font-semibold text-purple-200">
                        ${result.snapshot.other.valueUsd.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Truncation Notice if Whale Wallet */}
            {result.snapshot.truncated && (
              <div className="p-3 bg-yellow-950/50 border border-yellow-700/50 rounded-lg text-xs text-yellow-200">
                Notice: This wallet contains over 3,000 digital assets. Ingestion capped at 3,000 to maintain sub-second response times.
              </div>
            )}
          </section>
        )}

        {/* Security & Trust Footer Notice */}
        <footer className="text-center text-xs text-purple-400 space-y-1 mt-4">
          <p>
            Soltrace operates strictly in read-only mode on public ledger data.
          </p>
          <p>
            We never request, store, or accept private keys, seed phrases, or wallet approvals.
          </p>
        </footer>
      </main>
    </>
  );
}

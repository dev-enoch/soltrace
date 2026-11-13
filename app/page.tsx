"use client";

import { SyntheticEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isValidAddress } from "@/lib/base58";
import About from "@/components/about";
import Support from "@/components/support";

interface WalletResult {
  address: string;
  balanceSol: string;
  lamports: number;
  tokenAccountsCount: number;
  stage: string;
  status: string;
  message: string;
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<WalletResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<"standard" | "pro" | "savage">(
    "standard"
  );

  const analyzeData = async (event: SyntheticEvent) => {
    event.preventDefault();
    const trimmed = wallet.trim();

    if (!trimmed) {
      setError("Please enter a Solana wallet address.");
      setResult(null);
      return;
    }

    if (!isValidAddress(trimmed)) {
      setError(
        "Invalid Solana wallet address. Please enter a valid 32-44 character Base58 address (e.g. System Program, Wrapped SOL, or standard public key)."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/wallet/${encodeURIComponent(trimmed)}`);
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
            Stage 1: Stabilisation Shell Active
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Analyse Solana Wallet Holdings &amp; Risk
          </h1>
          <p className="text-lg md:text-xl text-purple-200 max-w-2xl mx-auto">
            Fast, deterministic portfolio inspection. Free to check, zero signatures required.
          </p>

          {/* Mode Selector */}
          <div className="flex flex-wrap justify-center items-center gap-3 mt-2">
            <span className="text-sm text-purple-300">Analysis Mode:</span>
            <div className="flex gap-2 bg-purple-900/40 p-1 rounded-lg border border-purple-800">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedMode === "standard"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-300 hover:text-white"
                }`}
                onClick={() => setSelectedMode("standard")}
              >
                Standard
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedMode === "pro"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-300 hover:text-white"
                }`}
                onClick={() => setSelectedMode("pro")}
              >
                Pro
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedMode === "savage"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-300 hover:text-white"
                }`}
                onClick={() => setSelectedMode("savage")}
              >
                Savage
              </button>
            </div>
          </div>

          {/* Wallet Input Form */}
          <form
            onSubmit={analyzeData}
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
              placeholder="Paste any Solana address (e.g. 3PNb... or So11...)"
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
                  Verifying...
                </span>
              ) : (
                "Analyse"
              )}
            </button>
          </form>

          {/* Error Banner - only shown when error is not empty */}
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-lg text-red-200 text-sm text-left flex items-start gap-2">
              <span className="font-semibold text-red-400">Error:</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Results Card */}
        <section className="w-full flex flex-col gap-4 p-6 bg-purple-950/50 border border-purple-800/80 rounded-xl shadow-xl">
          <div className="flex justify-between items-center border-b border-purple-800/60 pb-3">
            <h2 className="text-xl font-bold tracking-wide">Wallet Overview</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-800/70 text-purple-200">
              Read-Only
            </span>
          </div>

          {result ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-800/60">
                  <div className="text-xs uppercase tracking-wider text-purple-300">
                    Native SOL Balance
                  </div>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">
                    {result.balanceSol}
                  </div>
                </div>

                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-800/60">
                  <div className="text-xs uppercase tracking-wider text-purple-300">
                    SPL Token Accounts
                  </div>
                  <div className="text-2xl font-bold mt-1 text-purple-100">
                    {result.tokenAccountsCount}
                  </div>
                </div>

                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-800/60">
                  <div className="text-xs uppercase tracking-wider text-purple-300">
                    Verification Status
                  </div>
                  <div className="text-2xl font-bold mt-1 text-purple-200 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                    Confirmed
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-800/40">
                <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">
                  Validated Public Address
                </div>
                <div className="font-mono text-sm break-all text-purple-200">
                  {result.address}
                </div>
              </div>

              <div className="p-4 bg-purple-900/20 border border-purple-800/40 rounded-lg text-sm text-purple-200 leading-relaxed">
                <p className="font-semibold text-purple-100 mb-1">
                  {result.stage}: Honest System Health
                </p>
                <p>{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-purple-300 text-sm">
              Enter any Solana address above to verify balances and view portfolio holdings.
            </div>
          )}
        </section>

        {/* Security & Trust Footer Notice */}
        <footer className="text-center text-xs text-purple-400 space-y-1">
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

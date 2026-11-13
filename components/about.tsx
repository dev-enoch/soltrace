"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function About() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-transparent hover:bg-purple-800/50 text-white text-xs border border-purple-700/40"
        >
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-purple-900 border border-purple-700 text-white p-6 rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-purple-100 text-lg font-bold">
            About Soltrace
          </DialogTitle>
          <DialogDescription className="text-purple-300 text-sm">
            Portfolio risk terminal for Solana wallets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-purple-200 leading-relaxed">
          <p>
            <strong className="text-white">Soltrace</strong> is an independent portfolio analysis tool designed to give Solana holders a clear, honest read on their token holdings and exposure.
          </p>
          <p>
            Unlike explorers that merely dump raw token lists or apps that require wallet connection approvals, Soltrace is strictly <strong className="text-purple-100">read-only</strong>. No signatures, no seed phrases, and no third-party tracking.
          </p>
          <div className="p-3 bg-purple-950/70 border border-purple-800 rounded-lg text-xs text-purple-300">
            <span className="font-semibold text-purple-200 block mb-1">Roadmap Status</span>
            Currently running <span className="text-emerald-400 font-mono">Stage 1: Stabilise</span>. Upcoming stages introduce Helius DAS ingestion, Jupiter Price batching, and the versioned 0-100 deterministic risk engine.
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

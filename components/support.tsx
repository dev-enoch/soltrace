"use client";

import { useState } from "react";
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

const DONATION_ADDRESS = "3PNbsyVavwf17Jr36yfapzNeoLwzjY6eKmoMvdy87FWK";

export default function Support() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-purple-700/60 hover:bg-purple-700 text-white text-xs border border-purple-500/40"
        >
          Support
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-purple-900 border border-purple-700 text-white p-6 rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-purple-100 text-lg font-bold">
            Support Soltrace Development
          </DialogTitle>
          <DialogDescription className="text-purple-300 text-sm">
            Soltrace is independently developed by Enoch Philip Dibal. If you appreciate the rebuild, you can tip in SOL to the treasury address below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3 bg-purple-950/80 rounded-lg border border-purple-800">
            <span className="text-xs uppercase tracking-wider text-purple-400 block mb-1">
              Solana Tip Address
            </span>
            <code className="text-xs font-mono break-all text-purple-200 block selection:bg-purple-600">
              {DONATION_ADDRESS}
            </code>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCopy}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2"
            >
              {copied ? "Copied Address!" : "Copy Solana Address"}
            </Button>
            <a
              href="https://x.com/earhyel"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-md bg-purple-800/80 hover:bg-purple-800 text-purple-200 hover:text-white text-xs font-medium border border-purple-700/60 flex items-center justify-center transition-colors"
            >
              @earhyel on X
            </a>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="bg-purple-950 text-purple-300 hover:text-white text-xs border border-purple-800"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

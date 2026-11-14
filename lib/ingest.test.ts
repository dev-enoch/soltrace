import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestWallet, InvalidAddressError, IngestProviderError } from "./ingest";
import * as heliusModule from "./helius";
import * as priceModule from "./price";
import * as prismaModule from "./prisma";
import * as redisModule from "./redis";

describe("ingestWallet", () => {
  const validAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const invalidAddress = "not-a-valid-solana-address";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(redisModule, "getRedis").mockReturnValue(null);
    // Mock prisma to avoid calling live DB in unit tests
    vi.spyOn(prismaModule.prisma, "wallet", "get").mockReturnValue({
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "w_1", address: validAddress }),
      update: vi.fn().mockResolvedValue({ id: "w_1" }),
    } as unknown as typeof prismaModule.prisma.wallet);

    vi.spyOn(prismaModule.prisma, "$transaction").mockImplementation(async (callback) => {
      const mockTx = {
        wallet: { upsert: vi.fn().mockResolvedValue({ id: "w_1" }) },
        snapshot: { create: vi.fn().mockResolvedValue({ id: "snap_1" }) },
        holding: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      };
      return callback(mockTx as unknown as typeof prismaModule.prisma);
    });
  });

  it("throws InvalidAddressError for invalid base58 address", async () => {
    await expect(ingestWallet(invalidAddress)).rejects.toThrow(InvalidAddressError);
  });

  it("fixture 1: 100% SOL wallet", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockResolvedValue(5_000_000_000); // 5 SOL
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: [],
      truncated: false,
      total: 0,
    });
    vi.spyOn(priceModule, "getPrices").mockResolvedValue(
      new Map([[priceModule.WRAPPED_SOL_MINT, 200.0]])
    );

    const res = await ingestWallet(validAddress);
    expect(res.cached).toBe(false);
    expect(res.snapshot.totalUsd).toBe(1000.0);
    expect(res.snapshot.holdings).toHaveLength(1);
    expect(res.snapshot.holdings[0].symbol).toBe("SOL");
    expect(res.snapshot.holdings[0].amount).toBe(5);
    expect(res.snapshot.holdings[0].valueUsd).toBe(1000.0);
    expect(res.snapshot.holdings[0].pct).toBe(100);
    expect(res.snapshot.other.count).toBe(0);
    expect(res.snapshot.pricedPct).toBe(100);
  });

  it("fixture 2: whale wallet with 3,000+ accounts and truncation flag", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockResolvedValue(100_000_000_000); // 100 SOL
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: Array.from({ length: 3000 }, (_, i) => ({
        id: `mint_${i}`,
        interface: "FungibleToken",
        token_info: {
          decimals: 6,
          balance: 10_000_000, // 10 tokens
        },
      })),
      truncated: true,
      total: 4500,
    });
    vi.spyOn(priceModule, "getPrices").mockResolvedValue(
      new Map([
        [priceModule.WRAPPED_SOL_MINT, 200.0],
        ["mint_0", 50.0],
        ["mint_1", 20.0],
      ])
    );

    const res = await ingestWallet(validAddress);
    expect(res.snapshot.truncated).toBe(true);
    expect(res.snapshot.holdings.length).toBeLessThanOrEqual(200);
    expect(res.snapshot.other.count).toBeGreaterThan(0);
  });

  it("fixture 3: pure spam tokens wallet (dust filtered out to other row)", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockResolvedValue(0);
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: [
        {
          id: "spam_1",
          interface: "FungibleToken",
          token_info: { decimals: 6, balance: 1_000_000 },
        },
        {
          id: "spam_2",
          interface: "FungibleToken",
          token_info: { decimals: 6, balance: 500_000 },
        },
      ],
      truncated: false,
      total: 2,
    });
    // Prices are negligible (dust: valueUsd < 0.01)
    vi.spyOn(priceModule, "getPrices").mockResolvedValue(
      new Map([
        ["spam_1", 0.000001],
        ["spam_2", 0.000002],
      ])
    );

    const res = await ingestWallet(validAddress);
    expect(res.snapshot.holdings).toHaveLength(0); // All dust filtered out of top holdings
    expect(res.snapshot.other.count).toBe(2);
    expect(res.snapshot.other.valueUsd).toBe(0);
  });

  it("fixture 4: fresh empty wallet", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockResolvedValue(0);
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: [],
      truncated: false,
      total: 0,
    });
    vi.spyOn(priceModule, "getPrices").mockResolvedValue(new Map());

    const res = await ingestWallet(validAddress);
    expect(res.snapshot.totalUsd).toBe(0);
    expect(res.snapshot.holdings).toHaveLength(0);
    expect(res.snapshot.other.count).toBe(0);
  });

  it("correctly handles token decimals (e.g. 6 decimals for USDC)", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockResolvedValue(0);
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: [
        {
          id: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          interface: "FungibleToken",
          token_info: {
            symbol: "USDC",
            decimals: 6,
            balance: 1_000_000, // 1 USDC
          },
        },
      ],
      truncated: false,
      total: 1,
    });
    vi.spyOn(priceModule, "getPrices").mockResolvedValue(
      new Map([["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 1.0]])
    );

    const res = await ingestWallet(validAddress);
    expect(res.snapshot.holdings[0].amount).toBe(1.0);
    expect(res.snapshot.holdings[0].valueUsd).toBe(1.0);
  });

  it("failure is loud: throws IngestProviderError when provider call rejects", async () => {
    vi.spyOn(heliusModule.HeliusClient.prototype, "getBalance").mockRejectedValue(
      new Error("RPC Rate Limit Exceeded")
    );
    vi.spyOn(heliusModule.HeliusClient.prototype, "getAssetsByOwner").mockResolvedValue({
      assets: [],
      truncated: false,
      total: 0,
    });

    await expect(ingestWallet(validAddress)).rejects.toThrow(IngestProviderError);
  });
});

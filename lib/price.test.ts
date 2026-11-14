import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrices, WRAPPED_SOL_MINT } from "./price";
import * as redisModule from "./redis";

describe("getPrices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(redisModule, "getRedis").mockReturnValue(null);
  });

  it("returns an empty map when passed an empty list", async () => {
    const res = await getPrices([]);
    expect(res.size).toBe(0);
  });

  it("correctly fetches and maps Jupiter prices", async () => {
    const mockPrices = {
      data: {
        [WRAPPED_SOL_MINT]: { id: WRAPPED_SOL_MINT, price: "215.50" },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPrices,
    } as unknown as Response);

    const res = await getPrices([WRAPPED_SOL_MINT]);
    expect(res.get(WRAPPED_SOL_MINT)).toBe(215.5);
  });
});

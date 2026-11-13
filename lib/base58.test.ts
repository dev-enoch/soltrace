import { describe, it, expect } from "vitest";
import { isValidAddress } from "./base58";

describe("Solana Address Validation (isValidAddress)", () => {
  it("accepts valid system program (32 characters)", () => {
    const systemProgram = "11111111111111111111111111111111";
    expect(systemProgram.length).toBe(32);
    expect(isValidAddress(systemProgram)).toBe(true);
  });

  it("accepts valid wrapped SOL mint (43 characters)", () => {
    const wrappedSol = "So11111111111111111111111111111111111111112";
    expect(wrappedSol.length).toBe(43);
    expect(isValidAddress(wrappedSol)).toBe(true);
  });

  it("accepts valid standard 44-character address", () => {
    const standardAddress = "3PNbsyVavwf17Jr36yfapzNeoLwzjY6eKmoMvdy87FWK";
    expect(standardAddress.length).toBe(44);
    expect(isValidAddress(standardAddress)).toBe(true);
  });

  it("rejects 44 characters of junk / non-base58 characters", () => {
    const junkAddress = "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$";
    expect(junkAddress.length).toBe(44);
    expect(isValidAddress(junkAddress)).toBe(false);
  });

  it("rejects empty string and whitespace-only string", () => {
    expect(isValidAddress("")).toBe(false);
    expect(isValidAddress("   ")).toBe(false);
  });

  it("accepts whitespace-padded valid address after trimming", () => {
    const padded = "   3PNbsyVavwf17Jr36yfapzNeoLwzjY6eKmoMvdy87FWK   ";
    expect(isValidAddress(padded)).toBe(true);
  });

  it("rejects invalid lengths and non-string inputs", () => {
    expect(isValidAddress("short")).toBe(false);
    expect(isValidAddress("11111111111111111111111111111111111111111111111111")).toBe(false);
    expect(isValidAddress(null)).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
    expect(isValidAddress(123456789)).toBe(false);
  });
});


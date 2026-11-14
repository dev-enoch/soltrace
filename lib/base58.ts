/**
 * Base58 decoding implementation for Solana address validation.
 * Uses Bitcoin/Solana alphabet (123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz).
 * Zero runtime dependencies, keeping the client bundle minimal (<220 KB).
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP = new Map<string, bigint>();

for (let i = 0; i < ALPHABET.length; i++) {
  const char = ALPHABET[i];
  if (char) {
    ALPHABET_MAP.set(char, BigInt(i));
  }
}

const ZERO_BI = BigInt(0);
const FIFTY_EIGHT_BI = BigInt(58);
const BYTE_MASK_BI = BigInt(0xff);
const EIGHT_BI = BigInt(8);

export function decodeBase58(str: string): Uint8Array | null {
  if (typeof str !== "string" || str.length === 0) return null;

  let num = ZERO_BI;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (!char) return null;
    const val = ALPHABET_MAP.get(char);
    if (val === undefined) return null;
    num = num * FIFTY_EIGHT_BI + val;
  }

  const bytes: number[] = [];
  while (num > ZERO_BI) {
    bytes.unshift(Number(num & BYTE_MASK_BI));
    num = num >> EIGHT_BI;
  }

  // Preserve leading zeros ('1' in Base58 corresponds to byte 0x00)
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

/**
 * Validates whether a given string is a valid Solana public key address:
 * - Must be a non-empty string between 32 and 44 characters (trimmed)
 * - Must be composed exclusively of Base58 characters
 * - Must decode to exactly 32 bytes
 */
export function isValidAddress(address: unknown): boolean {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;

  const decoded = decodeBase58(trimmed);
  return decoded !== null && decoded.length === 32;
}

export const isValidSolanaAddress = isValidAddress;

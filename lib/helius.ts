/**
 * Helius DAS (Digital Asset Standard) and RPC client.
 * Server-side only: uses HELIUS_API_KEY to fetch wallet assets and native SOL balance.
 */

export interface DasTokenInfo {
  symbol?: string;
  decimals: number;
  balance: number;
  price_info?: {
    price_per_token?: number;
    total_price?: number;
  };
}

export interface DasAsset {
  id: string; // mint address
  interface: string;
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
    };
    links?: {
      image?: string;
    };
  };
  token_info?: DasTokenInfo;
}

export interface DasAssetsResponse {
  total: number;
  limit: number;
  page: number;
  items: DasAsset[];
}

export class HeliusClient {
  private rpcUrl: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.HELIUS_API_KEY;
    if (!key) {
      // Fallback to standard solana RPC if Helius key not yet configured
      this.rpcUrl =
        process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    } else {
      this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${key}`;
    }
  }

  /**
   * Fetches native SOL balance in lamports.
   */
  async getBalance(address: string): Promise<number> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "balance",
        method: "getBalance",
        params: [address, { commitment: "confirmed" }],
      }),
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Helius getBalance failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.result?.value ?? 0;
  }

  /**
   * Fetches assets owned by an address via DAS getAssetsByOwner with pagination cap.
   * Capped at 3 pages (up to 3,000 assets) to control latency and credit spend.
   */
  async getAssetsByOwner(
    address: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ assets: DasAsset[]; truncated: boolean; total: number }> {
    const limit = options.limit || 1000;
    let page = options.page || 1;
    const maxPages = 3;
    const allAssets: DasAsset[] = [];
    let isTruncated = false;
    let reportedTotal = 0;

    while (page <= maxPages) {
      const res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `assets-p${page}`,
          method: "getAssetsByOwner",
          params: {
            ownerAddress: address,
            page,
            limit,
            displayOptions: {
              showFungible: true,
              showNativeBalance: true,
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Helius getAssetsByOwner failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(`Helius RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      const result: DasAssetsResponse = data.result || {
        total: 0,
        limit,
        page,
        items: [],
      };
      reportedTotal = result.total;

      if (!result.items || result.items.length === 0) {
        break;
      }

      allAssets.push(...result.items);

      if (result.items.length < limit || allAssets.length >= result.total) {
        break;
      }

      page++;
      if (page > maxPages && allAssets.length < result.total) {
        isTruncated = true;
      }
    }

    return {
      assets: allAssets,
      truncated: isTruncated,
      total: reportedTotal || allAssets.length,
    };
  }
}

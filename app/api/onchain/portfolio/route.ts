import { NextRequest, NextResponse } from "next/server";

type BlockscoutToken = {
  name?: string | null;
  symbol?: string | null;
  address?: string | null;
  decimals?: string | number | null;
  type?: string | null;
  exchange_rate?: string | null;
};

type BlockscoutBalance = {
  value?: string | null;
  token?: BlockscoutToken | null;
};

type PortfolioAsset = {
  chain: string;
  symbol: string;
  name: string;
  address: string | null;
  amount: number;
  priceUsd: number;
  usdValue: number;
  native: boolean;
};

type ChainResult = {
  name: string;
  slug: string;
  explorer: string;
  totalUsd: number;
  assets: PortfolioAsset[];
  unpricedAssets: number;
  ok: boolean;
  error?: string;
};

const CHAINS = [
  {
    name: "Base",
    slug: "base",
    explorer: "https://base.blockscout.com",
    nativeSymbol: "ETH",
  },
  {
    name: "Robinhood Chain",
    slug: "robinhood",
    explorer: "https://robinhoodchain.blockscout.com",
    nativeSymbol: "ETH",
  },
] as const;

function safeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTokenAmount(rawValue: string, decimals: number): number {
  if (!/^\d+$/.test(rawValue) || decimals < 0 || decimals > 36) return 0;

  try {
    const raw = BigInt(rawValue);
    const scale = 10n ** BigInt(decimals);
    const whole = raw / scale;
    const fraction = raw % scale;

    // Keep up to 8 decimal places to avoid precision problems in the UI.
    const fractionDigits = Math.min(decimals, 8);
    const divisor = 10n ** BigInt(Math.max(decimals - fractionDigits, 0));
    const trimmedFraction = fractionDigits
      ? Number(fraction / divisor) / 10 ** fractionDigits
      : 0;

    return Number(whole) + trimmedFraction;
  } catch {
    return 0;
  }
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Tapmo/0.1",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Explorer returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadChain(
  chain: (typeof CHAINS)[number],
  address: string
): Promise<ChainResult> {
  try {
    const encoded = encodeURIComponent(address);

    const [addressInfo, tokenBalances] = await Promise.all([
      fetchJson(`${chain.explorer}/api/v2/addresses/${encoded}`),
      fetchJson(
        `${chain.explorer}/api/v2/addresses/${encoded}/token-balances`
      ),
    ]);

    const assets: PortfolioAsset[] = [];
    let unpricedAssets = 0;

    const nativeRaw = String(addressInfo?.coin_balance ?? "0");
    const nativePrice = safeNumber(addressInfo?.exchange_rate);
    const nativeAmount = toTokenAmount(nativeRaw, 18);

    if (nativeAmount > 0) {
      if (nativePrice > 0) {
        assets.push({
          chain: chain.name,
          symbol: chain.nativeSymbol,
          name: "Ether",
          address: null,
          amount: nativeAmount,
          priceUsd: nativePrice,
          usdValue: nativeAmount * nativePrice,
          native: true,
        });
      } else {
        unpricedAssets += 1;
      }
    }

    const balances: BlockscoutBalance[] = Array.isArray(tokenBalances)
      ? tokenBalances
      : Array.isArray(tokenBalances?.items)
        ? tokenBalances.items
        : [];

    for (const item of balances) {
      const token = item?.token;
      if (!token || token.type !== "ERC-20") continue;

      const decimals = safeNumber(token.decimals);
      const rawValue = String(item?.value ?? "0");
      const amount = toTokenAmount(rawValue, decimals);

      if (amount <= 0) continue;

      const priceUsd = safeNumber(token.exchange_rate);

      if (priceUsd <= 0) {
        unpricedAssets += 1;
        continue;
      }

      const usdValue = amount * priceUsd;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;

      assets.push({
        chain: chain.name,
        symbol: token.symbol || "TOKEN",
        name: token.name || token.symbol || "Token",
        address: token.address || null,
        amount,
        priceUsd,
        usdValue,
        native: false,
      });
    }

    assets.sort((a, b) => b.usdValue - a.usdValue);

    const totalUsd = assets.reduce((sum, asset) => sum + asset.usdValue, 0);

    return {
      name: chain.name,
      slug: chain.slug,
      explorer: chain.explorer,
      totalUsd,
      assets,
      unpricedAssets,
      ok: true,
    };
  } catch (error) {
    return {
      name: chain.name,
      slug: chain.slug,
      explorer: chain.explorer,
      totalUsd: 0,
      assets: [],
      unpricedAssets: 0,
      ok: false,
      error: error instanceof Error ? error.message : "Explorer unavailable",
    };
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "A valid EVM wallet address is required." },
      { status: 400 }
    );
  }

  const chains = await Promise.all(
    CHAINS.map((chain) => loadChain(chain, address))
  );

  const assets = chains
    .flatMap((chain) => chain.assets)
    .sort((a, b) => b.usdValue - a.usdValue);

  const totalUsd = chains.reduce((sum, chain) => sum + chain.totalUsd, 0);
  const unpricedAssets = chains.reduce(
    (sum, chain) => sum + chain.unpricedAssets,
    0
  );

  return NextResponse.json({
    address,
    totalUsd,
    assets: assets.slice(0, 20),
    chains: chains.map(({ assets: chainAssets, ...chain }) => ({
      ...chain,
      assetCount: chainAssets.length,
    })),
    unpricedAssets,
    pricedAssetCount: assets.length,
    source: "Blockscout",
    scope: ["Base", "Robinhood Chain"],
    updatedAt: new Date().toISOString(),
  });
}

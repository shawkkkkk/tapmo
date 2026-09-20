import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const JUPITER_PRICE_LITE = "https://lite-api.jup.ag/price/v3";
const JUPITER_PRICE_PRO = "https://api.jup.ag/price/v3";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnYcHwhfx";
const WRAPPED_SOL = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

type ParsedTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

type RpcResponse<T> = {
  result?: T;
  error?: { message?: string };
};

type JupiterPrice = {
  usdPrice?: number;
};

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(process.env.SOLANA_RPC_URL || DEFAULT_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Solana RPC returned ${response.status}`);
  }

  const data = (await response.json()) as RpcResponse<T>;

  if (data.error) {
    throw new Error(data.error.message || "Solana RPC error");
  }

  if (data.result === undefined) {
    throw new Error("Solana RPC returned no result.");
  }

  return data.result;
}

async function tokenAccountsByProgram(address: string, programId: string) {
  const result = await rpc<{ value?: ParsedTokenAccount[] }>(
    "getTokenAccountsByOwner",
    [
      address,
      { programId },
      {
        commitment: "confirmed",
        encoding: "jsonParsed",
      },
    ]
  );

  return result.value || [];
}

async function getPrices(mints: string[]) {
  const unique = Array.from(new Set(mints)).slice(0, 200);
  const prices: Record<string, number> = {};

  for (let index = 0; index < unique.length; index += 50) {
    const batch = unique.slice(index, index + 50);
    if (!batch.length) continue;

    const endpoint = process.env.JUPITER_API_KEY
      ? JUPITER_PRICE_PRO
      : JUPITER_PRICE_LITE;

    const response = await fetch(
      `${endpoint}?ids=${encodeURIComponent(batch.join(","))}`,
      {
        headers: process.env.JUPITER_API_KEY
          ? { "x-api-key": process.env.JUPITER_API_KEY }
          : undefined,
        cache: "no-store",
      }
    );

    if (!response.ok) continue;

    const data = (await response.json()) as Record<string, JupiterPrice>;

    for (const mint of batch) {
      const value = Number(data[mint]?.usdPrice);
      if (Number.isFinite(value) && value > 0) {
        prices[mint] = value;
      }
    }
  }

  // Native Circle USDC is redeemable 1:1 for USD; use $1 as a conservative
  // fallback if the pricing API omits it temporarily.
  if (!prices[USDC_MINT]) {
    prices[USDC_MINT] = 1;
  }

  return prices;
}

function shortMint(mint: string) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() || "";

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json(
      { error: "A valid Solana public address is required." },
      { status: 400 }
    );
  }

  try {
    const [balanceResult, legacyAccounts, token2022Accounts] = await Promise.all([
      rpc<{ value?: number }>("getBalance", [
        address,
        { commitment: "confirmed" },
      ]),
      tokenAccountsByProgram(address, TOKEN_PROGRAM),
      tokenAccountsByProgram(address, TOKEN_2022_PROGRAM),
    ]);

    const balances = new Map<string, number>();

    for (const item of [...legacyAccounts, ...token2022Accounts]) {
      const info = item.account?.data?.parsed?.info;
      const mint = info?.mint;
      const amount = Number(info?.tokenAmount?.uiAmountString || 0);

      if (!mint || !Number.isFinite(amount) || amount <= 0) continue;
      balances.set(mint, (balances.get(mint) || 0) + amount);
    }

    const solAmount = Number(balanceResult.value || 0) / 1_000_000_000;
    const priceMints = Array.from(balances.keys());

    if (solAmount > 0) {
      priceMints.push(WRAPPED_SOL);
    }

    const prices = await getPrices(priceMints);

    const assets = Array.from(balances.entries())
      .map(([mint, amount]) => {
        const priceUsd = prices[mint] || 0;
        const symbol = mint === USDC_MINT ? "USDC" : shortMint(mint);
        return {
          mint,
          symbol,
          name: mint === USDC_MINT ? "USD Coin" : "SPL Token",
          amount,
          priceUsd,
          usdValue: priceUsd > 0 ? amount * priceUsd : 0,
          cash: mint === USDC_MINT,
          native: false,
        };
      })
      .filter((asset) => asset.amount > 0);

    if (solAmount > 0) {
      const solPrice = prices[WRAPPED_SOL] || 0;
      assets.push({
        mint: WRAPPED_SOL,
        symbol: "SOL",
        name: "Solana",
        amount: solAmount,
        priceUsd: solPrice,
        usdValue: solPrice > 0 ? solAmount * solPrice : 0,
        cash: false,
        native: true,
      });
    }

    assets.sort((a, b) => b.usdValue - a.usdValue);

    const totalUsd = assets.reduce((sum, asset) => sum + asset.usdValue, 0);
    const cashUsd = assets
      .filter((asset) => asset.cash)
      .reduce((sum, asset) => sum + asset.usdValue, 0);
    const unpricedAssets = assets.filter(
      (asset) => asset.amount > 0 && asset.priceUsd <= 0
    ).length;

    return NextResponse.json({
      address,
      totalUsd,
      cashUsd,
      usdcAmount:
        assets.find((asset) => asset.mint === USDC_MINT)?.amount || 0,
      assets: assets.slice(0, 30),
      pricedAssetCount: assets.filter((asset) => asset.priceUsd > 0).length,
      unpricedAssets,
      source: {
        balances: "Solana JSON-RPC",
        prices: process.env.JUPITER_API_KEY
          ? "Jupiter Price API"
          : "Jupiter Lite Price API",
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read Solana balances.",
      },
      { status: 502 }
    );
  }
}

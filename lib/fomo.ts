export type FomoBalance = {
  source: "mock" | "fomo";
  currency: "USD";
  spendableBalance: number;
  wallet: string;
  verified: boolean;
};

export async function getFomoBalance(): Promise<FomoBalance> {
  // Replace this mock with the official Fomo integration when available.
  return {
    source: "mock",
    currency: "USD",
    spendableBalance: 143.62,
    wallet: "0x71F4...A92C",
    verified: true,
  };
}

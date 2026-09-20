import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    source: "mock",
    currency: "USD",
    spendableBalance: 143.62,
    wallet: "0x71F4...A92C",
    verified: true,
  });
}

import { NextResponse } from "next/server";
import {
  zeroHashBaseUrl,
  zeroHashCredentialsConfigured,
  zeroHashRequest,
  zeroHashTime,
} from "@/lib/zerohash";

export const runtime = "nodejs";

export async function GET() {
  const credentialsConfigured = zeroHashCredentialsConfigured();

  let certReachable = false;
  let serverTime: unknown = null;
  let connectivityError: string | null = null;

  try {
    serverTime = await zeroHashTime();
    certReachable = true;
  } catch (error) {
    connectivityError =
      error instanceof Error ? error.message : "Zero Hash connectivity failed.";
  }

  let authenticated = false;
  let authenticationError: string | null = null;

  if (credentialsConfigured) {
    try {
      // We deliberately discard participant data. This call only verifies
      // request signing + platform authentication.
      await zeroHashRequest<unknown>({
        route: "/participants?page=1",
      });
      authenticated = true;
    } catch (error) {
      authenticationError =
        error instanceof Error
          ? error.message
          : "Zero Hash authentication failed.";
    }
  }

  return NextResponse.json({
    environment: process.env.ZERO_HASH_ENV === "prod" ? "prod" : "cert",
    baseUrl: zeroHashBaseUrl(),
    certReachable,
    credentialsConfigured,
    authenticated,
    serverTime,
    connectivityError,
    authenticationError,
    staticOutboundIpRequired: true,
    note: credentialsConfigured
      ? "Authenticated calls also require the deployment egress IP to be allowlisted by Zero Hash."
      : "Add Cert credentials only after Zero Hash provisions a test Platform. Keep all secrets server-side.",
  });
}

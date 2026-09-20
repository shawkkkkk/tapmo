import { NextResponse } from "next/server";
import {
  marqetaBaseUrl,
  marqetaCredentialsConfigured,
  marqetaRequest,
} from "@/lib/marqeta";

export const runtime = "nodejs";

export async function GET() {
  const credentialsConfigured = marqetaCredentialsConfigured();

  let authenticated = false;
  let error: string | null = null;

  if (credentialsConfigured) {
    try {
      await marqetaRequest<unknown>({
        route: "/ping",
      });
      authenticated = true;
    } catch (caught) {
      error =
        caught instanceof Error ? caught.message : "Marqeta sandbox check failed.";
    }
  }

  return NextResponse.json({
    environment: "sandbox",
    baseUrl: marqetaBaseUrl(),
    credentialsConfigured,
    authenticated,
    error,
    note: credentialsConfigured
      ? authenticated
        ? "Marqeta sandbox credentials are working."
        : "Credentials are present but the sandbox authentication check failed."
      : "Add sandbox Application Token and Admin Access Token as server-only environment variables.",
  });
}

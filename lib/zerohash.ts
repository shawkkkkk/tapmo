import { createHmac } from "node:crypto";

export type ZeroHashEnvironment = "cert" | "prod";

const BASE_URLS: Record<ZeroHashEnvironment, string> = {
  cert: "https://api.cert.zerohash.com",
  prod: "https://api.zerohash.com",
};

function env(): ZeroHashEnvironment {
  return process.env.ZERO_HASH_ENV === "prod" ? "prod" : "cert";
}

export function zeroHashBaseUrl() {
  return BASE_URLS[env()];
}

export function zeroHashCredentialsConfigured() {
  return Boolean(
    process.env.ZERO_HASH_API_KEY &&
      process.env.ZERO_HASH_API_SECRET &&
      process.env.ZERO_HASH_PASSPHRASE
  );
}

function signRequest({
  timestamp,
  method,
  route,
  body,
}: {
  timestamp: string;
  method: string;
  route: string;
  body: string;
}) {
  const secret = process.env.ZERO_HASH_API_SECRET;

  if (!secret) {
    throw new Error("ZERO_HASH_API_SECRET is not configured.");
  }

  const payload = `${timestamp}${method.toUpperCase()}${route}${body}`;

  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
}

export async function zeroHashTime() {
  const response = await fetch(`${zeroHashBaseUrl()}/time`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Zero Hash /time returned ${response.status}`);
  }

  return response.json();
}

export async function zeroHashRequest<T>({
  method = "GET",
  route,
  body,
}: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  route: string;
  body?: unknown;
}): Promise<T> {
  if (!zeroHashCredentialsConfigured()) {
    throw new Error("Zero Hash credentials are not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestBody =
    method === "GET" ? "{}" : body === undefined ? "{}" : JSON.stringify(body);

  const signature = signRequest({
    timestamp,
    method,
    route,
    body: requestBody,
  });

  const response = await fetch(`${zeroHashBaseUrl()}${route}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-SCX-API-KEY": process.env.ZERO_HASH_API_KEY!,
      "X-SCX-SIGNED": signature,
      "X-SCX-TIMESTAMP": timestamp,
      "X-SCX-PASSPHRASE": process.env.ZERO_HASH_PASSPHRASE!,
    },
    body: method === "GET" ? undefined : requestBody,
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Zero Hash ${method} ${route} returned ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`
    );
  }

  return data as T;
}

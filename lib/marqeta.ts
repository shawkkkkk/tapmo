const DEFAULT_BASE_URL = "https://sandbox-api.marqeta.com/v3";

export function marqetaBaseUrl() {
  return (process.env.MARQETA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function marqetaCredentialsConfigured() {
  return Boolean(
    process.env.MARQETA_APPLICATION_TOKEN &&
      process.env.MARQETA_ADMIN_ACCESS_TOKEN
  );
}

function basicAuthHeader() {
  const appToken = process.env.MARQETA_APPLICATION_TOKEN;
  const adminToken = process.env.MARQETA_ADMIN_ACCESS_TOKEN;

  if (!appToken || !adminToken) {
    throw new Error("Marqeta sandbox credentials are not configured.");
  }

  return `Basic ${Buffer.from(`${appToken}:${adminToken}`).toString("base64")}`;
}

export async function marqetaRequest<T>({
  method = "GET",
  route,
  body,
}: {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  route: string;
  body?: unknown;
}): Promise<T> {
  if (!marqetaCredentialsConfigured()) {
    throw new Error("Marqeta sandbox credentials are not configured.");
  }

  const response = await fetch(`${marqetaBaseUrl()}${route}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: basicAuthHeader(),
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
      `Marqeta ${method} ${route} returned ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`
    );
  }

  return data as T;
}

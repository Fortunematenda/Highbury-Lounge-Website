import { ChannelManagerError } from "../../types";
import { getBeds24Config, type Beds24Config } from "./config";

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

/** Module-level access-token cache (Workers isolate). Refresh before expiry. */
let tokenCache: CachedToken | null = null;

const EXPIRY_SKEW_MS = 60_000;

export function clearBeds24TokenCache() {
  tokenCache = null;
}

async function fetchAccessToken(config: Beds24Config): Promise<CachedToken> {
  const url = `${config.apiBaseUrl}/authentication/token`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      refreshToken: config.refreshToken,
    },
  });
  const text = await res.text();
  let data: { token?: string; expiresIn?: number; error?: string } = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!res.ok || !data.token) {
    throw new ChannelManagerError(
      data.error ||
        `Beds24 token refresh failed (${res.status}). Check BEDS24_REFRESH_TOKEN.`,
      res.status === 401 || res.status === 403 ? 401 : 502,
      "beds24_auth",
    );
  }
  const expiresInSec = Number(data.expiresIn) || 86400;
  return {
    token: data.token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };
}

export async function getBeds24AccessToken(
  config = getBeds24Config(),
): Promise<string> {
  if (!config.refreshToken) {
    throw new ChannelManagerError(
      "BEDS24_REFRESH_TOKEN is not configured.",
      503,
      "beds24_not_configured",
    );
  }
  if (tokenCache && tokenCache.expiresAtMs - EXPIRY_SKEW_MS > Date.now()) {
    return tokenCache.token;
  }
  tokenCache = await fetchAccessToken(config);
  return tokenCache.token;
}

export type Beds24RequestOptions = {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Skip auth (unused for most endpoints) */
  skipAuth?: boolean;
};

export async function beds24Request<T = unknown>(
  path: string,
  options: Beds24RequestOptions = {},
  config = getBeds24Config(),
): Promise<T> {
  const method = options.method ?? "GET";
  const url = new URL(
    path.startsWith("http") ? path : `${config.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (!options.skipAuth) {
    headers.token = await getBeds24AccessToken(config);
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res = await fetch(url.toString(), { method, headers, body });

  // One retry on auth failure with a fresh token
  if (res.status === 401 && !options.skipAuth) {
    clearBeds24TokenCache();
    headers.token = await getBeds24AccessToken(config);
    res = await fetch(url.toString(), { method, headers, body });
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof parsed === "object" &&
      parsed &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `Beds24 request failed (${res.status})`;
    throw new ChannelManagerError(msg, res.status >= 500 ? 502 : res.status, "beds24_api");
  }

  return parsed as T;
}

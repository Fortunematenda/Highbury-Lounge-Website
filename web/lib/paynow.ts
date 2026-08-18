/**
 * Paynow Zimbabwe web checkout helpers (hash + initiate + poll).
 * Hashing matches the official Paynow Node SDK:
 * URL-encode values, concat in field order, append integrationKey.toLowerCase(), SHA512 uppercase.
 */

const INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const PAYNOW_PROXY_URL =
  (typeof process !== "undefined" &&
    process.env.PAYNOW_PROXY_URL?.trim().replace(/\/$/, "")) ||
  "http://127.0.0.1:3010";

/** Outbound HTTPS via Node (bypasses workerd fetch "Network connection lost"). */
async function postInitiateViaNodeHttps(body: string): Promise<string> {
  const https = await import("node:https");
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.paynow.co.zw",
        path: "/interface/initiatetransaction",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Accept: "*/*",
        },
        timeout: 25000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Paynow request timed out"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function postInitiate(body: string): Promise<string> {
  // 1) Node https (best path inside wrangler local / Docker)
  try {
    return await postInitiateViaNodeHttps(body);
  } catch (err) {
    console.error("Paynow node:https failed:", err);
  }

  // 2) Local Node proxy (same container)
  try {
    const proxied = await fetch(`${PAYNOW_PROXY_URL}/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (proxied.ok || proxied.status < 500) {
      return await proxied.text();
    }
  } catch (err) {
    console.error("Paynow proxy failed:", err);
  }

  // 3) Worker fetch last
  const res = await fetch(INITIATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/plain, */*",
    },
    body,
  });
  return res.text();
}

export class PaynowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type PaynowEntityType =
  | "booking"
  | "ticket_order"
  | "food_order"
  | "conference";

function readEnv(name: string): string {
  const fromProcess = (process.env[name] || "").trim();
  if (fromProcess) return fromProcess;
  try {
    // Optional Cloudflare Worker bindings (wrangler vars / .dev.vars)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require("cloudflare:workers") as {
      env?: Record<string, string | undefined>;
    };
    return String(env?.[name] ?? "").trim();
  } catch {
    return "";
  }
}

export function getPaynowConfig() {
  const integrationId = readEnv("PAYNOW_INTEGRATION_ID");
  const integrationKey = readEnv("PAYNOW_INTEGRATION_KEY");
  const siteUrl = (readEnv("SITE_URL") || readEnv("PUBLIC_SITE_URL")).replace(
    /\/$/,
    "",
  );
  // Guest checkout stays off until Paynow goes live. Set PAYNOW_ENABLED=true to turn on.
  const enabledRaw = readEnv("PAYNOW_ENABLED").toLowerCase();
  const enabled = enabledRaw === "true" || enabledRaw === "1" || enabledRaw === "yes";

  return { integrationId, integrationKey, siteUrl, enabled };
}

export function isPaynowConfigured() {
  const { integrationId, integrationKey, siteUrl, enabled } = getPaynowConfig();
  return Boolean(enabled && integrationId && integrationKey && siteUrl);
}

export function requirePaynowConfig() {
  const config = getPaynowConfig();
  if (!config.enabled) {
    throw new PaynowError(
      "Online Paynow checkout is not enabled yet. Please pay by bank transfer.",
      503,
    );
  }
  if (!config.integrationId || !config.integrationKey) {
    throw new PaynowError(
      "Paynow is not configured. Set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY.",
      503,
    );
  }
  if (!config.siteUrl) {
    throw new PaynowError(
      "SITE_URL is required for Paynow return and result URLs.",
      503,
    );
  }
  return config;
}

async function sha512Upper(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-512", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function urlEncode(value: string): string {
  return encodeURI(value);
}

function urlDecode(value: string): string {
  return decodeURIComponent(
    (value + "").replace(/%(?![\da-f]{2})/gi, "%25").replace(/\+/g, "%20"),
  );
}

/** Build Paynow hash (Node SDK compatible). */
export async function createPaynowHash(
  values: Record<string, string>,
  integrationKey: string,
): Promise<string> {
  let concat = "";
  for (const [key, value] of Object.entries(values)) {
    if (key.toLowerCase() === "hash") continue;
    concat += value ?? "";
  }
  concat += integrationKey.toLowerCase();
  return sha512Upper(concat);
}

export async function verifyPaynowHash(
  values: Record<string, string>,
  integrationKey: string,
): Promise<boolean> {
  const provided = (values.hash || values.Hash || "").toUpperCase();
  if (!provided) return false;
  const expected = await createPaynowHash(values, integrationKey);
  return provided === expected;
}

function parsePaynowBody(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pairs = (raw.startsWith("?") ? raw.slice(1) : raw).split("&");
  for (const pair of pairs) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = urlDecode(idx >= 0 ? pair.slice(0, idx) : pair);
    const value = urlDecode(idx >= 0 ? pair.slice(idx + 1) : "");
    out[key] = value;
  }
  return out;
}

export type InitiatePaymentInput = {
  reference: string;
  amount: number;
  additionalInfo: string;
  returnUrl: string;
  resultUrl: string;
  authEmail?: string | null;
};

export type InitiatePaymentResult = {
  success: boolean;
  browserUrl?: string;
  pollUrl?: string;
  paynowReference?: string;
  error?: string;
  raw: Record<string, string>;
};

export async function initiatePayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  const { integrationId, integrationKey } = requirePaynowConfig();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaynowError("Payment amount must be greater than zero.");
  }

  // Field order matches official Paynow Node SDK `build()`.
  // Hash uses raw (not encoded) values + integrationKey.toLowerCase() per Paynow docs.
  const fields: Record<string, string> = {
    resulturl: input.resultUrl,
    returnurl: input.returnUrl,
    reference: input.reference,
    amount: amount.toFixed(2),
    id: String(integrationId),
    additionalinfo: input.additionalInfo.slice(0, 200),
    authemail: input.authEmail?.trim().toLowerCase() || "",
    status: "Message",
  };

  fields.hash = await createPaynowHash(fields, integrationKey);

  const body = new URLSearchParams(fields).toString();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const rawText = await postInitiate(body);
      const raw = parsePaynowBody(rawText);
      const status = (raw.status || "").toLowerCase();

      if (status === "ok" || status === "ok!") {
        return {
          success: true,
          browserUrl: raw.browserurl || raw.browserUrl,
          pollUrl: raw.pollurl || raw.pollUrl,
          paynowReference: raw.paynowreference || raw.paynowReference,
          raw,
        };
      }

      // If proxy returned JSON error, surface it.
      if (rawText.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawText) as { error?: string };
          if (parsed.error) {
            return { success: false, error: parsed.error, raw };
          }
        } catch {
          /* ignore */
        }
      }

      return {
        success: false,
        error: raw.error || raw.status || rawText || "Paynow initiation failed.",
        raw,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const retryable =
        /network connection lost|fetch failed|econnreset|etimedout|socket/i.test(
          message,
        );
      if (!retryable || attempt === 4) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "Unknown network error";
  throw new PaynowError(
    `Could not reach Paynow (${detail}). Check outbound HTTPS from the server to www.paynow.co.zw.`,
    502,
  );
}

export type PollPaymentResult = {
  paid: boolean;
  status: string;
  amount?: string;
  reference?: string;
  paynowReference?: string;
  raw: Record<string, string>;
};

export async function pollPayment(pollUrl: string): Promise<PollPaymentResult> {
  const { integrationKey } = requirePaynowConfig();
  const res = await fetch(pollUrl, { method: "POST", body: null });
  const rawText = await res.text();
  const raw = parsePaynowBody(rawText);

  if (raw.hash) {
    const ok = await verifyPaynowHash(raw, integrationKey);
    if (!ok) {
      throw new PaynowError("Invalid Paynow poll hash.", 400);
    }
  }

  const status = (raw.status || "").trim();
  const paid = status.toLowerCase() === "paid";
  return {
    paid,
    status,
    amount: raw.amount,
    reference: raw.reference,
    paynowReference: raw.paynowreference || raw.paynowReference,
    raw,
  };
}

export function parsePaynowResultBody(rawText: string): Record<string, string> {
  return parsePaynowBody(rawText);
}

export function paynowMerchantReference(entityType: PaynowEntityType, id: number) {
  const stamp = Date.now().toString(36).toUpperCase();
  const prefix =
    entityType === "booking"
      ? "BK"
      : entityType === "ticket_order"
        ? "TK"
        : entityType === "food_order"
          ? "FO"
          : "CF";
  return `PN-${prefix}-${id}-${stamp}`;
}

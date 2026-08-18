/**
 * Paynow Zimbabwe web checkout helpers (hash + initiate + poll).
 * Docs: https://developers.paynow.co.zw/
 */

const INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

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

export function getPaynowConfig() {
  const integrationId = (process.env.PAYNOW_INTEGRATION_ID || "").trim();
  const integrationKey = (process.env.PAYNOW_INTEGRATION_KEY || "").trim();
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  return { integrationId, integrationKey, siteUrl };
}

export function isPaynowConfigured() {
  const { integrationId, integrationKey, siteUrl } = getPaynowConfig();
  return Boolean(integrationId && integrationKey && siteUrl);
}

export function requirePaynowConfig() {
  const config = getPaynowConfig();
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

/** Build Paynow hash: concatenate field values (excluding hash) + integration key. */
export async function createPaynowHash(
  values: Record<string, string>,
  integrationKey: string,
): Promise<string> {
  let concat = "";
  for (const [key, value] of Object.entries(values)) {
    if (key.toLowerCase() === "hash") continue;
    concat += value ?? "";
  }
  concat += integrationKey;
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
  const params = new URLSearchParams(raw);
  for (const [key, value] of params.entries()) {
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

  const fields: Record<string, string> = {
    id: String(integrationId),
    reference: input.reference,
    amount: amount.toFixed(2),
    additionalinfo: input.additionalInfo.slice(0, 200),
    returnurl: input.returnUrl,
    resulturl: input.resultUrl,
    status: "Message",
  };
  if (input.authEmail?.trim()) {
    fields.authemail = input.authEmail.trim().toLowerCase();
  }
  fields.hash = await createPaynowHash(fields, integrationKey);

  const body = new URLSearchParams(fields).toString();
  const res = await fetch(INITIATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const rawText = await res.text();
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

  return {
    success: false,
    error: raw.error || raw.status || "Paynow initiation failed.",
    raw,
  };
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
  const res = await fetch(pollUrl, { method: "GET" });
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

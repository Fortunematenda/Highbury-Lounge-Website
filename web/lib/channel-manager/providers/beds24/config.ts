import { isTruthyEnv, readServerEnv } from "../../env";

export const BEDS24_PROVIDER = "beds24" as const;

export const DEFAULT_BEDS24_API_BASE = "https://beds24.com/api/v2";

/** Booking.com accommodation number for Highbury Lounge (mapping pending). */
export const BOOKING_COM_ACCOMMODATION_NUMBER = "17125847";

export type Beds24Config = {
  enabled: boolean;
  refreshToken: string;
  propertyId: string;
  webhookSecret: string;
  apiBaseUrl: string;
};

export function getBeds24Config(): Beds24Config {
  const enabled = isTruthyEnv(readServerEnv("BEDS24_ENABLED"));
  const refreshToken = readServerEnv("BEDS24_REFRESH_TOKEN");
  const propertyId = readServerEnv("BEDS24_PROPERTY_ID");
  const webhookSecret = readServerEnv("BEDS24_WEBHOOK_SECRET");
  const apiBaseUrl = (
    readServerEnv("BEDS24_API_BASE_URL") || DEFAULT_BEDS24_API_BASE
  ).replace(/\/$/, "");

  return {
    enabled,
    refreshToken,
    propertyId,
    webhookSecret,
    apiBaseUrl,
  };
}

export function isBeds24Enabled(): boolean {
  return getBeds24Config().enabled;
}

/**
 * Credentials may be present for Test Connection while sync remains off.
 */
export function hasBeds24Credentials(): boolean {
  const { refreshToken, propertyId } = getBeds24Config();
  return Boolean(refreshToken && propertyId);
}

export function requireBeds24Enabled(): Beds24Config {
  const config = getBeds24Config();
  if (!config.enabled) {
    throw new Error(
      "Beds24 synchronisation is disabled. Set BEDS24_ENABLED=true after configuration.",
    );
  }
  if (!config.refreshToken) {
    throw new Error("BEDS24_REFRESH_TOKEN is not configured.");
  }
  if (!config.propertyId) {
    throw new Error("BEDS24_PROPERTY_ID is not configured.");
  }
  return config;
}

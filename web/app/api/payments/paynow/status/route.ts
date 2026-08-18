import { getPaynowConfig, isPaynowConfigured } from "@/lib/paynow";

/** Lightweight diagnostics — does not expose secrets. */
export async function GET() {
  const config = getPaynowConfig();
  const proxyUrl = (
    process.env.PAYNOW_PROXY_URL ||
    "http://127.0.0.1:3010"
  ).replace(/\/$/, "");

  let paynowReachable: boolean | null = null;
  let paynowProbeError: string | null = null;
  let proxyOk: boolean | null = null;

  try {
    const probe = await fetch(`${proxyUrl}/probe`, { method: "GET" });
    const data = (await probe.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      status?: number;
    };
    proxyOk = probe.ok;
    paynowReachable = Boolean(data.ok);
    paynowProbeError = data.error || null;
  } catch (err) {
    proxyOk = false;
    paynowReachable = false;
    paynowProbeError = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    configured: isPaynowConfigured(),
    hasIntegrationId: Boolean(config.integrationId),
    hasIntegrationKey: Boolean(config.integrationKey),
    siteUrl: config.siteUrl || null,
    proxyUrl,
    proxyOk,
    paynowReachable,
    paynowProbeError,
  });
}

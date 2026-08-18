import { getPaynowConfig, isPaynowConfigured } from "@/lib/paynow";

/** Lightweight diagnostics — does not expose secrets. */
export async function GET() {
  const config = getPaynowConfig();
  let paynowReachable: boolean | null = null;
  let paynowProbeError: string | null = null;

  try {
    const res = await fetch("https://www.paynow.co.zw/", {
      method: "GET",
      redirect: "follow",
    });
    paynowReachable = res.ok || res.status < 500;
  } catch (err) {
    paynowReachable = false;
    paynowProbeError = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    configured: isPaynowConfigured(),
    hasIntegrationId: Boolean(config.integrationId),
    hasIntegrationKey: Boolean(config.integrationKey),
    siteUrl: config.siteUrl || null,
    paynowReachable,
    paynowProbeError,
  });
}

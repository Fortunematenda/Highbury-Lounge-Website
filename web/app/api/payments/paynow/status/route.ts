import { isPaynowConfigured, getPaynowConfig } from "@/lib/paynow";

/** Lightweight diagnostics — does not expose secrets. */
export async function GET() {
  const config = getPaynowConfig();
  return Response.json({
    configured: isPaynowConfigured(),
    hasIntegrationId: Boolean(config.integrationId),
    hasIntegrationKey: Boolean(config.integrationKey),
    siteUrl: config.siteUrl || null,
  });
}

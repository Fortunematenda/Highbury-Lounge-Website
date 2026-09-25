import { eq } from "drizzle-orm";
import { Plug } from "lucide-react";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import {
  BOOKING_COM_ACCOMMODATION_NUMBER,
  BEDS24_PROVIDER,
  getBeds24Config,
  hasBeds24Credentials,
  isBeds24Enabled,
  listChannelSyncLogs,
} from "@/lib/channel-manager";
import {
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";
import {
  Beds24IntegrationClient,
  type Beds24Status,
} from "./beds24-client";

export const dynamic = "force-dynamic";

export default async function Beds24IntegrationPage() {
  await requireAdminPage(["administrator"]);
  const config = getBeds24Config();
  const db = getDb();
  const rooms = await db.select({ id: roomTypes.id }).from(roomTypes);
  const mappings = await db
    .select()
    .from(channelRoomMappings)
    .where(eq(channelRoomMappings.provider, BEDS24_PROVIDER));
  const mappedIds = new Set(mappings.map((m) => m.localRoomTypeId));
  const unmapped = rooms.filter((r) => !mappedIds.has(r.id)).length;
  const logs = await listChannelSyncLogs({
    provider: BEDS24_PROVIDER,
    limit: 100,
  });
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const lastSuccess = logs.find((l) => l.status === "SUCCESS") ?? null;
  const lastInbound = logs.find(
    (l) => l.direction === "INBOUND" && l.eventType.startsWith("booking"),
  );
  const lastPrice = logs.find((l) => l.eventType.includes("rate"));
  const lastInventory = logs.find((l) => l.eventType.includes("inventory"));

  const initialStatus: Beds24Status = {
    enabled: isBeds24Enabled(),
    credentialsPresent: hasBeds24Credentials(),
    propertyIdConfigured: Boolean(config.propertyId),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    apiBaseUrl: config.apiBaseUrl,
    bookingComAccommodationNumber: BOOKING_COM_ACCOMMODATION_NUMBER,
    roomMapping: {
      totalRooms: rooms.length,
      mapped: mappings.length,
      unmapped,
      status:
        mappings.length === 0
          ? "Not Mapped"
          : unmapped > 0
            ? "Partial"
            : "Mapped",
    },
    lastSuccessfulSync: lastSuccess?.createdAt ?? null,
    lastIncomingBooking: lastInbound?.createdAt ?? null,
    lastPriceUpdate: lastPrice?.createdAt ?? null,
    lastInventoryUpdate: lastInventory?.createdAt ?? null,
    failedSynchronisations: failed,
    webhookStatus: config.webhookSecret
      ? isBeds24Enabled()
        ? "Secret configured — required for live webhooks"
        : "Secret configured (verify custom header in Beds24)"
      : isBeds24Enabled()
        ? "MISSING — set BEDS24_WEBHOOK_SECRET before relying on inbound bookings"
        : "Not set — required when BEDS24_ENABLED=true",
    message: isBeds24Enabled()
      ? "Beds24 synchronisation is enabled."
      : "Beds24 synchronisation is disabled.",
  };

  return (
    <DetailPageShell
      pageTitle="Beds24"
      breadcrumbs={[
        { label: "Integrations", href: "/admin/integrations/beds24" },
        { label: "Beds24" },
      ]}
      title="Beds24"
      description="Channel manager preparation for Beds24 and Booking.com. Live sync stays off until BEDS24_ENABLED=true."
      backAction={{ label: "Back to settings", href: "/admin/settings" }}
    >
      <DetailSectionCard title="Integration health" icon={Plug}>
        <Beds24IntegrationClient initialStatus={initialStatus} />
      </DetailSectionCard>
    </DetailPageShell>
  );
}

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import {
  BEDS24_PROVIDER,
  BOOKING_COM_ACCOMMODATION_NUMBER,
  getBeds24Config,
  hasBeds24Credentials,
  isBeds24Enabled,
} from "./providers/beds24/config";
import { writeChannelSyncLog } from "./sync-log";

/** Known Highbury Lounge external IDs (Beds24 ↔ Booking.com). */
export const HIGHBURY_BEDS24_DEFAULTS = {
  propertyId: "356723",
  roomId: "735291",
  roomNameMatch: "Double Room with Garden View",
  externalRoomName: "Double Room with Garden View",
  bookingComHotelId: BOOKING_COM_ACCOMMODATION_NUMBER,
  bookingComRoomId: "1712584701",
  bookingComRatePlanId: "68553475",
} as const;

export type GoLiveCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
};

export type GoLiveReadiness = {
  ready: boolean;
  enabled: boolean;
  checks: GoLiveCheck[];
  blocking: string[];
  nextSteps: string[];
};

export async function getBeds24GoLiveReadiness(): Promise<GoLiveReadiness> {
  const config = getBeds24Config();
  const db = getDb();
  const mappings = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.enabled, true),
      ),
    );

  const gardenMapped = mappings.some(
    (m) =>
      m.externalRoomId === HIGHBURY_BEDS24_DEFAULTS.roomId &&
      (m.externalPropertyId === HIGHBURY_BEDS24_DEFAULTS.propertyId ||
        m.externalPropertyId === config.propertyId),
  );

  const checks: GoLiveCheck[] = [
    {
      id: "property_id",
      label: "Beds24 property ID",
      ok: Boolean(config.propertyId),
      detail: config.propertyId
        ? `Configured as ${config.propertyId}`
        : `Set BEDS24_PROPERTY_ID=${HIGHBURY_BEDS24_DEFAULTS.propertyId}`,
      required: true,
    },
    {
      id: "refresh_token",
      label: "Beds24 refresh token",
      ok: Boolean(config.refreshToken),
      detail: config.refreshToken
        ? "Present (server-side only)"
        : "Set BEDS24_REFRESH_TOKEN from Beds24 API invite exchange",
      required: true,
    },
    {
      id: "webhook_secret",
      label: "Webhook shared secret",
      ok: Boolean(config.webhookSecret),
      detail: config.webhookSecret
        ? "Present — required for live inbound Booking.com bookings"
        : "Set BEDS24_WEBHOOK_SECRET and the same value in Beds24 Access → Booking Webhook",
      required: true,
    },
    {
      id: "garden_mapping",
      label: "Double Room with Garden View → 735291",
      ok: gardenMapped,
      detail: gardenMapped
        ? "Mapped and enabled"
        : "Apply recommended mapping (or map manually under Room Mapping)",
      required: true,
    },
    {
      id: "any_mapping",
      label: "At least one enabled room mapping",
      ok: mappings.length > 0,
      detail: mappings.length
        ? `${mappings.length} enabled mapping(s)`
        : "No enabled mappings",
      required: true,
    },
    {
      id: "credentials_pair",
      label: "Credentials usable for Test Connection",
      ok: hasBeds24Credentials(),
      detail: hasBeds24Credentials()
        ? "Refresh token + property id present"
        : "Incomplete credentials",
      required: true,
    },
    {
      id: "live_flag",
      label: "BEDS24_ENABLED",
      ok: config.enabled,
      detail: config.enabled
        ? "Live synchronisation is ON"
        : "Still false — flip only after all required checks pass",
      required: false,
    },
  ];

  const blocking = checks
    .filter((c) => c.required && !c.ok)
    .map((c) => c.label);
  const ready = blocking.length === 0;

  const nextSteps: string[] = [];
  if (!config.propertyId) {
    nextSteps.push(
      `Set BEDS24_PROPERTY_ID=${HIGHBURY_BEDS24_DEFAULTS.propertyId} on the server`,
    );
  }
  if (!config.refreshToken) {
    nextSteps.push("Generate and set BEDS24_REFRESH_TOKEN");
  }
  if (!config.webhookSecret) {
    nextSteps.push("Set BEDS24_WEBHOOK_SECRET and configure Beds24 webhook header");
  }
  if (!gardenMapped) {
    nextSteps.push(
      "Apply recommended Garden View mapping (room 735291) or save it manually",
    );
  }
  if (ready && !config.enabled) {
    nextSteps.push(
      "Run Test Connection, then set BEDS24_ENABLED=true and redeploy/restart",
    );
  }
  if (ready && config.enabled) {
    nextSteps.push("Monitor Sync Logs and Rates channel status after go-live");
  }

  return {
    ready,
    enabled: isBeds24Enabled(),
    checks,
    blocking,
    nextSteps,
  };
}

/**
 * Upsert the known Highbury Garden View room mapping.
 * Matches local room by name (case-insensitive contains).
 */
export async function applyRecommendedGardenViewMapping() {
  const db = getDb();
  const config = getBeds24Config();
  const propertyId =
    config.propertyId || HIGHBURY_BEDS24_DEFAULTS.propertyId;

  const rooms = await db.select().from(roomTypes);
  const match =
    rooms.find((r) =>
      r.name.toLowerCase().includes("garden view"),
    ) ||
    rooms.find((r) =>
      r.name.toLowerCase().includes("double room"),
    );

  if (!match) {
    return {
      ok: false as const,
      message:
        'No local room matching "Garden View" / "Double Room" was found. Create the room type first.',
    };
  }

  const [existing] = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.localRoomTypeId, match.id),
      ),
    )
    .limit(1);

  let mappingId: number;
  if (existing) {
    const [row] = await db
      .update(channelRoomMappings)
      .set({
        externalPropertyId: propertyId,
        externalRoomId: HIGHBURY_BEDS24_DEFAULTS.roomId,
        externalRoomName: HIGHBURY_BEDS24_DEFAULTS.externalRoomName,
        externalRatePlanId: HIGHBURY_BEDS24_DEFAULTS.bookingComRatePlanId,
        enabled: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(channelRoomMappings.id, existing.id))
      .returning();
    mappingId = row.id;
  } else {
    const [row] = await db
      .insert(channelRoomMappings)
      .values({
        provider: BEDS24_PROVIDER,
        localRoomTypeId: match.id,
        externalPropertyId: propertyId,
        externalRoomId: HIGHBURY_BEDS24_DEFAULTS.roomId,
        externalRoomName: HIGHBURY_BEDS24_DEFAULTS.externalRoomName,
        externalRatePlanId: HIGHBURY_BEDS24_DEFAULTS.bookingComRatePlanId,
        enabled: true,
      })
      .returning();
    mappingId = row.id;
  }

  await writeChannelSyncLog({
    provider: BEDS24_PROVIDER,
    entityType: "room_type",
    entityId: match.id,
    externalReference: HIGHBURY_BEDS24_DEFAULTS.roomId,
    direction: "OUTBOUND",
    eventType: "mapping.recommended",
    status: "SUCCESS",
    message: `Mapped ${match.name} → Beds24 ${HIGHBURY_BEDS24_DEFAULTS.roomId} (property ${propertyId})`,
  });

  return {
    ok: true as const,
    mappingId,
    localRoomTypeId: match.id,
    localRoomName: match.name,
    externalRoomId: HIGHBURY_BEDS24_DEFAULTS.roomId,
    externalPropertyId: propertyId,
    message: `Mapped “${match.name}” to Beds24 room ${HIGHBURY_BEDS24_DEFAULTS.roomId}.`,
  };
}

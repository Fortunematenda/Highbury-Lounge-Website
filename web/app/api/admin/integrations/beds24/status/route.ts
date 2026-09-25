import { eq } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import {
  BEDS24_PROVIDER,
  getBeds24Config,
  getChannelManager,
  hasBeds24Credentials,
  isBeds24Enabled,
  listChannelSyncLogs,
  writeChannelSyncLog,
  BOOKING_COM_ACCOMMODATION_NUMBER,
} from "@/lib/channel-manager";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
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

    return Response.json({
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
        ? "Secret configured (verify custom header in Beds24)"
        : "Optional secret not set — endpoint accepts requests without header auth",
      message: isBeds24Enabled()
        ? "Beds24 synchronisation is enabled."
        : "Beds24 synchronisation is disabled.",
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load Beds24 status.", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(["administrator"]);
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "test") {
      return jsonError("Unsupported action.", 400);
    }

    const provider = getChannelManager();
    const result = await provider.testConnection();
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "connection",
      direction: "OUTBOUND",
      eventType: "connection.test",
      status: result.ok ? "SUCCESS" : "FAILED",
      message: result.message,
      error: result.ok ? null : result.message,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError(
      error instanceof Error ? error.message : "Connection test failed.",
      500,
    );
  }
}

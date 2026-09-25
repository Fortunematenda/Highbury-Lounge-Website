import { and, eq } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import {
  BEDS24_PROVIDER,
  getBeds24Config,
  writeChannelSyncLog,
} from "@/lib/channel-manager";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const db = getDb();
    const config = getBeds24Config();
    const rooms = await db
      .select({
        id: roomTypes.id,
        name: roomTypes.name,
        isActive: roomTypes.isActive,
      })
      .from(roomTypes)
      .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));


    const mappings = await db
      .select()
      .from(channelRoomMappings)
      .where(eq(channelRoomMappings.provider, BEDS24_PROVIDER));

    const byLocal = new Map(mappings.map((m) => [m.localRoomTypeId, m]));

    return Response.json({
      propertyId: config.propertyId || null,
      rooms: rooms.map((room) => {
        const m = byLocal.get(room.id);
        return {
          localRoomTypeId: room.id,
          localRoomName: room.name,
          isActive: room.isActive,
          mappingId: m?.id ?? null,
          externalPropertyId: m?.externalPropertyId ?? config.propertyId ?? "",
          externalRoomId: m?.externalRoomId ?? "",
          externalRoomName: m?.externalRoomName ?? "",
          externalRatePlanId: m?.externalRatePlanId ?? "",
          enabled: m?.enabled ?? false,
          status: m?.externalRoomId
            ? m.enabled
              ? "Mapped"
              : "Error"
            : "Not Mapped",
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load room mappings.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAdmin(["administrator"]);
    const body = await request.json();
    const localRoomTypeId = Number(body.localRoomTypeId);
    const externalRoomId = String(body.externalRoomId ?? "").trim();
    const externalPropertyId = String(
      body.externalPropertyId ?? getBeds24Config().propertyId ?? "",
    ).trim();
    const externalRoomName = String(body.externalRoomName ?? "").trim() || null;
    const externalRatePlanId =
      String(body.externalRatePlanId ?? "").trim() || null;
    const enabled = body.enabled !== false;

    if (!Number.isFinite(localRoomTypeId)) {
      return jsonError("localRoomTypeId is required.", 400);
    }

    const db = getDb();
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, localRoomTypeId))
      .limit(1);
    if (!room) return jsonError("Room type not found.", 404);

    if (!externalRoomId) {
      // Clear mapping
      await db
        .delete(channelRoomMappings)
        .where(
          and(
            eq(channelRoomMappings.provider, BEDS24_PROVIDER),
            eq(channelRoomMappings.localRoomTypeId, localRoomTypeId),
          ),
        );
      await writeAuditLog({
        adminUserId: user.id,
        action: "beds24.mapping.clear",
        entityType: "room_type",
        entityId: localRoomTypeId,
      });
      return Response.json({ ok: true, cleared: true });
    }

    if (!externalPropertyId) {
      return jsonError(
        "externalPropertyId is required (set BEDS24_PROPERTY_ID or pass it).",
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(channelRoomMappings)
      .where(
        and(
          eq(channelRoomMappings.provider, BEDS24_PROVIDER),
          eq(channelRoomMappings.localRoomTypeId, localRoomTypeId),
        ),
      )
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(channelRoomMappings)
        .set({
          externalPropertyId,
          externalRoomId,
          externalRoomName,
          externalRatePlanId,
          enabled,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(channelRoomMappings.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(channelRoomMappings)
        .values({
          provider: BEDS24_PROVIDER,
          localRoomTypeId,
          externalPropertyId,
          externalRoomId,
          externalRoomName,
          externalRatePlanId,
          enabled,
        })
        .returning();
    }

    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "room_type",
      entityId: localRoomTypeId,
      externalReference: externalRoomId,
      direction: "OUTBOUND",
      eventType: "mapping.upsert",
      status: "SUCCESS",
      message: `Mapped ${room.name} → Beds24 room ${externalRoomId}`,
    });

    await writeAuditLog({
      adminUserId: user.id,
      action: "beds24.mapping.upsert",
      entityType: "channel_room_mapping",
      entityId: row.id,
      details: { localRoomTypeId, externalRoomId },
    });

    return Response.json({ ok: true, mapping: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError(
      error instanceof Error ? error.message : "Could not save mapping.",
      500,
    );
  }
}

import { desc, eq } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { roomBlocks, roomTypes } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const rows = await db
      .select({
        id: roomBlocks.id,
        roomTypeId: roomBlocks.roomTypeId,
        roomName: roomTypes.name,
        startDate: roomBlocks.startDate,
        endDate: roomBlocks.endDate,
        roomsBlocked: roomBlocks.roomsBlocked,
        reason: roomBlocks.reason,
        adminNote: roomBlocks.adminNote,
        createdAt: roomBlocks.createdAt,
      })
      .from(roomBlocks)
      .innerJoin(roomTypes, eq(roomBlocks.roomTypeId, roomTypes.id))
      .orderBy(desc(roomBlocks.startDate));
    return Response.json({ blocks: rows });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load blocks.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) return jsonError("Forbidden", 403);

    const body = await request.json();
    const roomTypeId = Number(body.roomTypeId);
    const startDate = String(body.startDate ?? "");
    const endDate = String(body.endDate ?? "");
    const reason = String(body.reason ?? "").trim();
    const roomsBlocked = Number(body.roomsBlocked ?? 1);

    if (!roomTypeId || !startDate || !endDate || !reason) {
      return jsonError("Room, dates, and reason are required.", 400);
    }
    if (endDate <= startDate) {
      return jsonError("End date must be after start date.", 400);
    }

    const db = getDb();
    const [row] = await db
      .insert(roomBlocks)
      .values({
        roomTypeId,
        startDate,
        endDate,
        roomsBlocked,
        reason,
        adminNote: body.adminNote ? String(body.adminNote) : null,
        createdById: user.id,
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "block.create",
      entityType: "room_block",
      entityId: row.id,
      details: { roomTypeId, startDate, endDate, reason },
    });

    return Response.json({ ok: true, block: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not create block.", 500);
  }
}

import { eq } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { roomBlocks } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) return jsonError("Forbidden", 403);

    const { id } = await context.params;
    const blockId = Number(id);
    if (!Number.isFinite(blockId)) return jsonError("Invalid id.", 400);

    const db = getDb();
    await db.delete(roomBlocks).where(eq(roomBlocks.id, blockId));

    await writeAuditLog({
      adminUserId: user.id,
      action: "block.delete",
      entityType: "room_block",
      entityId: blockId,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not delete block.", 500);
  }
}

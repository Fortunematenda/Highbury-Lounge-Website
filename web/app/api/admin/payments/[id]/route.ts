import { eq } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
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
    const paymentId = Number(id);
    if (!Number.isFinite(paymentId)) return jsonError("Invalid payment id.", 400);

    const db = getDb();
    const [existing] = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        amount: payments.amount,
        currency: payments.currency,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    if (!existing) return jsonError("Payment not found.", 404);

    await db.delete(payments).where(eq(payments.id, paymentId));

    await writeAuditLog({
      adminUserId: user.id,
      action: "payment.delete",
      entityType: "payment",
      entityId: paymentId,
      details: {
        bookingId: existing.bookingId,
        amount: existing.amount,
        currency: existing.currency,
      },
    });

    return Response.json({ ok: true, deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not delete payment.", 500);
  }
}

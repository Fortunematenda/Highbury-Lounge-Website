import { desc, eq, sql } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { bookings, payments } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const rows = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        reference: bookings.reference,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        transactionReference: payments.transactionReference,
        paymentDate: payments.paymentDate,
        adminNote: payments.adminNote,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .orderBy(desc(payments.createdAt))
      .limit(200);
    return Response.json({ payments: rows });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load payments.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) return jsonError("Forbidden", 403);

    const body = await request.json();
    const bookingId = Number(body.bookingId);
    const amount = Number(body.amount);
    const method = String(body.method ?? "").trim();
    if (!bookingId || !Number.isFinite(amount) || amount <= 0 || !method) {
      return jsonError("Booking, amount, and method are required.", 400);
    }

    const db = getDb();
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return jsonError("Booking not found.", 404);

    const [row] = await db
      .insert(payments)
      .values({
        bookingId,
        amount,
        currency: String(body.currency ?? booking.currency ?? "USD"),
        method,
        status: String(body.status ?? "Paid"),
        transactionReference: body.transactionReference
          ? String(body.transactionReference)
          : null,
        paymentDate: body.paymentDate
          ? String(body.paymentDate)
          : new Date().toISOString().slice(0, 10),
        adminNote: body.adminNote ? String(body.adminNote) : null,
        recordedById: user.id,
      })
      .returning();

    const paidRows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.bookingId, bookingId));
    const paidTotal = paidRows.reduce((s, p) => s + p.amount, 0);
    let paymentStatus = "Unpaid";
    if (paidTotal >= booking.totalAmount) paymentStatus = "Paid";
    else if (paidTotal > 0) paymentStatus = "Partially Paid";

    await db
      .update(bookings)
      .set({ paymentStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(bookings.id, bookingId));

    await writeAuditLog({
      adminUserId: user.id,
      action: "payment.record",
      entityType: "payment",
      entityId: row.id,
      details: { bookingId, amount, method },
    });

    return Response.json({ ok: true, payment: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not record payment.", 500);
  }
}

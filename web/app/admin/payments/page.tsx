import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminUsers, bookings, payments } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";
import { PaymentForm } from "./payment-form";
import { PaymentsList } from "./payments-list";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireAdminPage(["booking_manager"]);
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
      recordedBy: adminUsers.fullName,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .leftJoin(adminUsers, eq(payments.recordedById, adminUsers.id))
    .orderBy(desc(payments.createdAt))
    .limit(200);

  const bookingOptions = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      totalAmount: bookings.totalAmount,
      currency: bookings.currency,
      paymentStatus: bookings.paymentStatus,
    })
    .from(bookings)
    .orderBy(desc(bookings.createdAt))
    .limit(100);

  const totalPaid = rows
    .filter((r) => r.status === "Paid")
    .reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="admin-page">
      <h1>Payments</h1>
      <p className="page-sub">
        Manual payment recording · {rows.length} listed · {formatMoney(totalPaid)}{" "}
        paid
      </p>

      <div className="admin-grid-2">
        <PaymentForm bookings={bookingOptions} />

        <section className="admin-card">
          <h2>Recent payments</h2>
          <PaymentsList rows={rows} />
        </section>
      </div>
    </div>
  );
}

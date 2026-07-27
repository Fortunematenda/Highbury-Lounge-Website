import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { PaymentCreateForm } from "../payment-create-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage() {
  await requireAdminPage(["booking_manager"]);
  const db = getDb();
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

  return <PaymentCreateForm bookings={bookingOptions} />;
}

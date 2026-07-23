import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  bookingStatusHistory,
  payments,
  roomTypes,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate, formatMoney, statusColor } from "@/lib/format";
import { LOCALE_NATIVE_NAMES, isAppLocale } from "@/lib/i18n/locales";
import { BookingNotesForm } from "./notes-form";
import { BookingStatusActions } from "./status-actions";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isFinite(bookingId)) notFound();

  const db = getDb();
  const [booking] = await db
    .select({
      booking: bookings,
      roomName: roomTypes.name,
    })
    .from(bookings)
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) notFound();

  const [guest] = await db
    .select()
    .from(bookingGuests)
    .where(eq(bookingGuests.bookingId, bookingId))
    .limit(1);

  const history = await db
    .select()
    .from(bookingStatusHistory)
    .where(eq(bookingStatusHistory.bookingId, bookingId))
    .orderBy(asc(bookingStatusHistory.createdAt));

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId));

  const b = booking.booking;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="page-sub">
            <Link href="/admin/bookings">Bookings</Link> / {b.reference}
          </p>
          <h1>{b.reference}</h1>
          <span
            className="admin-badge"
            style={{ background: statusColor(b.status) }}
          >
            {b.status}
          </span>
        </div>
      </header>

      <div className="admin-two-col">
        <section className="admin-card">
          <h2>Guest</h2>
          {guest ? (
            <dl className="admin-dl">
              <div>
                <dt>Name</dt>
                <dd>
                  {guest.firstName} {guest.lastName}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{guest.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{guest.phone}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{guest.whatsapp || "—"}</dd>
              </div>
              <div>
                <dt>Guest language</dt>
                <dd>
                  {b.preferredLanguage && isAppLocale(b.preferredLanguage)
                    ? LOCALE_NATIVE_NAMES[b.preferredLanguage]
                    : b.preferredLanguage || "English"}
                </dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{guest.country || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p>No guest record.</p>
          )}
        </section>

        <section className="admin-card">
          <h2>Stay</h2>
          <dl className="admin-dl">
            <div>
              <dt>Room</dt>
              <dd>{booking.roomName}</dd>
            </div>
            <div>
              <dt>Check-in</dt>
              <dd>{formatDate(b.checkIn)}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{formatDate(b.checkOut)}</dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>{b.nights}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>
                {b.adults} adults, {b.children} children
              </dd>
            </div>
            <div>
              <dt>Rooms booked</dt>
              <dd>{b.roomsBooked}</dd>
            </div>
            <div>
              <dt>Arrival</dt>
              <dd>{b.estimatedArrival || "—"}</dd>
            </div>
            <div>
              <dt>Special requests</dt>
              <dd>{b.specialRequests || "—"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="admin-card">
        <h2>Price breakdown</h2>
        <dl className="admin-dl">
          <div>
            <dt>Price / night</dt>
            <dd>{formatMoney(b.pricePerNight, b.currency)}</dd>
          </div>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(b.subtotal, b.currency)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{formatMoney(b.taxAmount, b.currency)}</dd>
          </div>
          <div>
            <dt>Service fee</dt>
            <dd>{formatMoney(b.serviceFee, b.currency)}</dd>
          </div>
          <div>
            <dt>Extras</dt>
            <dd>{formatMoney(b.extrasTotal, b.currency)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>
              <strong>{formatMoney(b.totalAmount, b.currency)}</strong>
            </dd>
          </div>
          <div>
            <dt>Payment status</dt>
            <dd>{b.paymentStatus}</dd>
          </div>
        </dl>
        <p className="page-sub">
          Online payment gateway is not connected yet. Record manual payments under Payments.
        </p>
      </section>

      <BookingStatusActions bookingId={b.id} currentStatus={b.status} />

      <BookingNotesForm bookingId={b.id} initialNotes={b.adminNotes || ""} />

      <section className="admin-card">
        <h2>Status history</h2>
        <ul className="admin-list">
          {history.length === 0 && <li>No history yet.</li>}
          {history.map((h) => (
            <li key={h.id}>
              {h.createdAt}: {h.previousStatus || "—"} → <strong>{h.newStatus}</strong>
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Payments</h2>
        {paymentRows.length === 0 ? (
          <p>No payments recorded. <Link href="/admin/payments">Record a payment</Link></p>
        ) : (
          <ul className="admin-list">
            {paymentRows.map((p) => (
              <li key={p.id}>
                {formatMoney(p.amount, p.currency)} via {p.method} — {p.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="page-sub">
        Created {b.createdAt} · Updated {b.updatedAt}
        {b.adminNotes ? ` · Notes: ${b.adminNotes}` : ""}
      </p>
    </div>
  );
}

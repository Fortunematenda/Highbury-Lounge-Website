import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  History,
  StickyNote,
  UserRound,
} from "lucide-react";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  bookingStatusHistory,
  payments,
  roomTypes,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate, formatMoney } from "@/lib/format";
import { LOCALE_NATIVE_NAMES, isAppLocale } from "@/lib/i18n/locales";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
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
  const guestName = guest
    ? `${guest.firstName} ${guest.lastName}`.trim()
    : "Guest";

  return (
    <DetailPageShell
      pageTitle={`Booking ${b.reference}`}
      breadcrumbs={[
        { label: "Bookings", href: "/admin/bookings" },
        { label: b.reference },
      ]}
      title={b.reference}
      description={`${guestName} · ${booking.roomName || "Room"} · ${formatDate(b.checkIn)} to ${formatDate(b.checkOut)}`}
      status={
        <>
          <StatusBadge status={b.status} />
          <StatusBadge status={b.paymentStatus} />
        </>
      }
      backAction={{ label: "Back to bookings", href: "/admin/bookings" }}
      sidebar={
        <>
          <section className="admin-card detail-section-card">
            <div className="detail-section-head">
              <div>
                <h2>Summary</h2>
              </div>
            </div>
            <dl className="detail-meta-list">
              <div>
                <dt>Guest</dt>
                <dd>{guestName}</dd>
              </div>
              <div>
                <dt>Room</dt>
                <dd>{booking.roomName || "—"}</dd>
              </div>
              <div>
                <dt>Stay</dt>
                <dd>
                  {formatDate(b.checkIn)} – {formatDate(b.checkOut)}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  <strong>{formatMoney(b.totalAmount, b.currency)}</strong>
                </dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{b.paymentStatus}</dd>
              </div>
            </dl>
          </section>
          <DetailMetadataCard
            items={[
              { label: "Created", value: b.createdAt },
              { label: "Last updated", value: b.updatedAt },
            ]}
          />
        </>
      }
    >
      <div className="detail-form-stack">
        <DetailSectionCard title="Guest" icon={UserRound}>
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
                <dt>Preferred language</dt>
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
            <p className="admin-empty">No guest details on file.</p>
          )}
        </DetailSectionCard>

        <DetailSectionCard title="Stay" icon={ClipboardList}>
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
        </DetailSectionCard>

        <DetailSectionCard title="Pricing" icon={CreditCard}>
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
              <dd>
                <StatusBadge status={b.paymentStatus} />
              </dd>
            </div>
          </dl>
          <p className="page-sub">
            Record manual payments from the Payments page.
          </p>
        </DetailSectionCard>

        <DetailSectionCard title="Status actions" icon={ClipboardList}>
          <BookingStatusActions bookingId={b.id} currentStatus={b.status} />
        </DetailSectionCard>

        <DetailSectionCard title="Internal notes" icon={StickyNote}>
          <BookingNotesForm bookingId={b.id} initialNotes={b.adminNotes || ""} />
        </DetailSectionCard>

        <DetailSectionCard title="Activity" icon={History}>
          <ul className="admin-list">
            {history.length === 0 ? <li>No status changes yet.</li> : null}
            {history.map((h) => (
              <li key={h.id}>
                {h.createdAt}: {h.previousStatus || "—"} →{" "}
                <strong>{h.newStatus}</strong>
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </DetailSectionCard>

        <DetailSectionCard title="Payments" icon={CreditCard}>
          {paymentRows.length === 0 ? (
            <p>
              No payments recorded.{" "}
              <Link href="/admin/payments">Record a payment</Link>
            </p>
          ) : (
            <ul className="admin-list">
              {paymentRows.map((p) => (
                <li key={p.id}>
                  {formatMoney(p.amount, p.currency)} via {p.method} — {p.status}
                </li>
              ))}
            </ul>
          )}
        </DetailSectionCard>
      </div>
    </DetailPageShell>
  );
}

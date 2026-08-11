import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
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
  adminNotifications,
  adminUsers,
  bookingGuests,
  bookings,
  bookingStatusHistory,
  payments,
  roomTypes,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import {
  formatAuditActorLabel,
  getLatestEntityChange,
} from "@/lib/audit";
import { formatDate, formatMoney } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";
import { getFoodOrderForBooking } from "@/lib/food-orders";
import { LOCALE_NATIVE_NAMES, isAppLocale } from "@/lib/i18n/locales";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { BookingFoodPreOrders } from "./food-preorders";
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
    .select({
      id: bookingStatusHistory.id,
      previousStatus: bookingStatusHistory.previousStatus,
      newStatus: bookingStatusHistory.newStatus,
      note: bookingStatusHistory.note,
      createdAt: bookingStatusHistory.createdAt,
      adminUserId: bookingStatusHistory.adminUserId,
      adminName: adminUsers.fullName,
      adminEmail: adminUsers.email,
    })
    .from(bookingStatusHistory)
    .leftJoin(
      adminUsers,
      eq(bookingStatusHistory.adminUserId, adminUsers.id),
    )
    .where(eq(bookingStatusHistory.bookingId, bookingId))
    .orderBy(asc(bookingStatusHistory.createdAt));

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId));

  const foodOrder = await getFoodOrderForBooking(bookingId);

  const bookingNotifs = await db
    .select()
    .from(adminNotifications)
    .where(eq(adminNotifications.entityId, bookingId))
    .orderBy(desc(adminNotifications.createdAt))
    .limit(30);

  const foodNotifs =
    foodOrder?.order != null
      ? await db
          .select()
          .from(adminNotifications)
          .where(eq(adminNotifications.entityId, foodOrder.order.id))
          .orderBy(desc(adminNotifications.createdAt))
          .limit(20)
      : [];

  const notificationHistory = [
    ...bookingNotifs.filter((n) => n.entityType === "booking"),
    ...foodNotifs.filter((n) => n.entityType === "food_order"),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20);

  const lastChange = await getLatestEntityChange("booking", bookingId);

  const b = booking.booking;
  const guestName = guest
    ? `${guest.firstName} ${guest.lastName}`.trim()
    : "Guest";

  const paidTotal = paymentRows
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const clientBalance = Math.round((b.totalAmount - paidTotal) * 100) / 100;
  const balanceLabel =
    clientBalance <= 0
      ? "Settled"
      : clientBalance >= b.totalAmount
        ? "Full balance due"
        : "Balance due";

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
                <dt>Paid</dt>
                <dd>{formatMoney(paidTotal, b.currency)}</dd>
              </div>
              <div>
                <dt>Client balance</dt>
                <dd>
                  <strong
                    className={
                      clientBalance > 0
                        ? "admin-balance-due"
                        : "admin-balance-paid"
                    }
                  >
                    {formatMoney(Math.max(0, clientBalance), b.currency)}
                  </strong>
                  <div className="admin-muted" style={{ fontWeight: 500 }}>
                    {balanceLabel}
                  </div>
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
              {
                label: "Created",
                value: formatVenueDateTime(b.createdAt, { withSeconds: true }),
              },
              {
                label: "Last updated",
                value: formatVenueDateTime(b.updatedAt, { withSeconds: true }),
              },
              {
                label: "Last changed by",
                value: lastChange?.actor
                  ? `${formatAuditActorLabel(lastChange.actor)}${
                      lastChange.actor.email
                        ? ` · ${lastChange.actor.email}`
                        : ""
                    }`
                  : null,
              },
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
              <dt>Amount paid</dt>
              <dd>{formatMoney(paidTotal, b.currency)}</dd>
            </div>
            <div>
              <dt>Client balance</dt>
              <dd>
                <strong
                  className={
                    clientBalance > 0
                      ? "admin-balance-due"
                      : "admin-balance-paid"
                  }
                >
                  {formatMoney(Math.max(0, clientBalance), b.currency)}
                </strong>
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
            Record manual payments from the Payments page.{" "}
            <Link href="/admin/payments/new">Record a payment</Link>
          </p>
        </DetailSectionCard>

        <BookingFoodPreOrders
          currency={b.currency}
          reference={foodOrder?.reference ?? null}
          status={foodOrder?.status ?? null}
          foodOrderId={foodOrder?.order?.id ?? null}
          specialInstructions={foodOrder?.specialInstructions ?? null}
          totalAmount={foodOrder?.totalAmount ?? b.extrasTotal}
          items={(foodOrder?.items ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            specialInstructions: item.specialInstructions,
            imageUrl: item.imageUrl,
          }))}
        />

        <DetailSectionCard title="Status actions" icon={ClipboardList}>
          <BookingStatusActions bookingId={b.id} currentStatus={b.status} />
        </DetailSectionCard>

        <DetailSectionCard title="Internal notes" icon={StickyNote}>
          <BookingNotesForm bookingId={b.id} initialNotes={b.adminNotes || ""} />
        </DetailSectionCard>

        <DetailSectionCard title="Booking timeline" icon={History}>
          <ul className="admin-list">
            {history.length === 0 ? <li>No status changes yet.</li> : null}
            {history.map((h) => (
              <li key={h.id}>
                {formatVenueDateTime(h.createdAt, { withSeconds: true })}:{" "}
                {h.previousStatus || "—"} →{" "}
                <strong>{h.newStatus}</strong>
                {h.note ? ` — ${h.note}` : ""}
                {h.adminName ? (
                  <span className="admin-muted">
                    {" "}
                    · by {h.adminName}
                    {h.adminEmail ? ` (${h.adminEmail})` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </DetailSectionCard>

        <DetailSectionCard title="Notifications history" icon={History}>
          {notificationHistory.length === 0 ? (
            <p className="admin-empty">No related admin notifications.</p>
          ) : (
            <ul className="admin-list">
              {notificationHistory.map((n) => (
                <li key={n.id}>
                  {formatVenueDateTime(n.createdAt, { withSeconds: true })}:{" "}
                  <strong>{n.title}</strong> — {n.message}
                  {n.isRead ? "" : " · unread"}
                </li>
              ))}
            </ul>
          )}
        </DetailSectionCard>

        <DetailSectionCard title="Payments" icon={CreditCard}>
          <dl className="admin-dl" style={{ marginBottom: 12 }}>
            <div>
              <dt>Booking total</dt>
              <dd>{formatMoney(b.totalAmount, b.currency)}</dd>
            </div>
            <div>
              <dt>Paid to date</dt>
              <dd>{formatMoney(paidTotal, b.currency)}</dd>
            </div>
            <div>
              <dt>Client balance</dt>
              <dd>
                <strong
                  className={
                    clientBalance > 0
                      ? "admin-balance-due"
                      : "admin-balance-paid"
                  }
                >
                  {formatMoney(Math.max(0, clientBalance), b.currency)}
                </strong>
              </dd>
            </div>
          </dl>
          {paymentRows.length === 0 ? (
            <p>
              No payments recorded.{" "}
              <Link href="/admin/payments/new">Record a payment</Link>
            </p>
          ) : (
            <ul className="admin-list">
              {paymentRows.map((p) => (
                <li key={p.id}>
                  {formatMoney(p.amount, p.currency)} via {p.method} — {p.status}
                  {p.paymentDate ? ` · ${p.paymentDate}` : ""}
                  {p.transactionReference
                    ? ` · Ref ${p.transactionReference}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </DetailSectionCard>
      </div>
    </DetailPageShell>
  );
}

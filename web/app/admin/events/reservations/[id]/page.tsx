import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarClock, StickyNote, Ticket, UserRound } from "lucide-react";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatEventDateTime } from "@/app/events/lib";
import { formatVenueDateTime } from "@/lib/timezone";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { ReservationStatusForm } from "./status-form";

export const dynamic = "force-dynamic";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const { id } = await params;
  const reservationId = Number(id);
  if (!Number.isFinite(reservationId)) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      reservation: eventReservations,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventStartAt: events.startAt,
      eventStatus: events.status,
    })
    .from(eventReservations)
    .leftJoin(events, eq(eventReservations.eventId, events.id))
    .where(eq(eventReservations.id, reservationId))
    .limit(1);
  if (!row) notFound();

  const r = row.reservation;

  return (
    <DetailPageShell
      pageTitle={`Reservation ${r.reference}`}
      breadcrumbs={[
        { label: "Event Reservations", href: "/admin/events/reservations" },
        { label: r.reference },
      ]}
      title={r.reference}
      description={`${r.fullName} · ${row.eventTitle || "Event"} · ${r.guestCount} guest(s)`}
      status={<StatusBadge status={r.status} />}
      backAction={{
        label: "Back to reservations",
        href: "/admin/events/reservations",
      }}
      sidebar={
        <DetailMetadataCard
          items={[
            {
              label: "Created",
              value: formatVenueDateTime(r.createdAt, { withSeconds: true }),
            },
            {
              label: "Last updated",
              value: formatVenueDateTime(r.updatedAt, { withSeconds: true }),
            },
            {
              label: "Event",
              value: row.eventTitle ? (
                <Link href={`/admin/events/${r.eventId}`}>{row.eventTitle}</Link>
              ) : null,
            },
          ]}
        />
      }
    >
      <div className="detail-form-stack">
        <DetailSectionCard title="Guest" icon={UserRound}>
          <dl className="admin-dl">
            <div>
              <dt>Name</dt>
              <dd>{r.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{r.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{r.phone}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{r.guestCount}</dd>
            </div>
            <div>
              <dt>Reservation type</dt>
              <dd>{r.reservationType || "—"}</dd>
            </div>
            <div>
              <dt>Seating request</dt>
              <dd>{r.seatingRequest || "—"}</dd>
            </div>
            <div>
              <dt>Guest notes</dt>
              <dd>{r.notes || "—"}</dd>
            </div>
          </dl>
        </DetailSectionCard>

        <DetailSectionCard title="Event" icon={CalendarClock}>
          {row.eventTitle ? (
            <dl className="admin-dl">
              <div>
                <dt>Event</dt>
                <dd>
                  <Link href={`/admin/events/${r.eventId}`}>{row.eventTitle}</Link>
                </dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>
                  {row.eventStartAt
                    ? formatEventDateTime(row.eventStartAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Event status</dt>
                <dd>{row.eventStatus ? <StatusBadge status={row.eventStatus} /> : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="admin-empty">This event could not be found.</p>
          )}
        </DetailSectionCard>

        <DetailSectionCard title="Reservation status" icon={Ticket}>
          <ReservationStatusForm
            reservationId={r.id}
            reference={r.reference}
            currentStatus={r.status}
            initialAdminNotes={r.adminNotes}
          />
        </DetailSectionCard>

        <DetailSectionCard title="Consent" icon={StickyNote}>
          <p className="page-sub">
            Guest {r.consentAccepted ? "accepted" : "did not accept"} the
            reservation consent checkbox.
          </p>
        </DetailSectionCard>
      </div>
    </DetailPageShell>
  );
}

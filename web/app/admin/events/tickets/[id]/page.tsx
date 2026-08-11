import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, StickyNote, Ticket, UserRound } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { getTicketOrderById } from "@/lib/event-tickets";
import { formatDate } from "@/lib/format";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { TicketOrderActions } from "./ticket-actions";
import { EventTicketPass } from "@/app/events/components/EventTicketPass";

export const dynamic = "force-dynamic";

export default async function TicketOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) notFound();

  const result = await getTicketOrderById(orderId);
  if (!result?.order) notFound();

  const { order, event } = result;
  const ticketUrl = `/events/tickets/${order.reference}`;

  return (
    <DetailPageShell
      pageTitle={`Ticket ${order.reference}`}
      breadcrumbs={[
        { label: "Event Tickets", href: "/admin/events/tickets" },
        { label: order.reference },
      ]}
      title={order.reference}
      description={`${order.fullName} · ${event?.title || "Event"} · ${order.quantity}× ${order.ticketTypeName}`}
      status={<StatusBadge status={order.paymentStatus} />}
      backAction={{
        label: "Back to ticket orders",
        href: "/admin/events/tickets",
      }}
      sidebar={
        <DetailMetadataCard
          items={[
            { label: "Created", value: order.createdAt },
            { label: "Last updated", value: order.updatedAt },
            {
              label: "Public ticket",
              value: (
                <Link href={ticketUrl} target="_blank">
                  Open guest view
                </Link>
              ),
            },
            {
              label: "Event",
              value: event ? (
                <Link href={`/admin/events/${order.eventId}`}>{event.title}</Link>
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
              <dd>{order.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{order.phone}</dd>
            </div>
            <div>
              <dt>Tickets</dt>
              <dd>
                {order.quantity}× {order.ticketTypeName}
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {order.currency} {Number(order.totalAmount).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt>Ticket code</dt>
              <dd>{order.ticketCode || "— (issued on verify)"}</dd>
            </div>
          </dl>
        </DetailSectionCard>

        <DetailSectionCard title="Event" icon={CalendarClock}>
          {event ? (
            <dl className="admin-dl">
              <div>
                <dt>Event</dt>
                <dd>
                  <Link href={`/admin/events/${order.eventId}`}>{event.title}</Link>
                </dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>
                  {event.startAt
                    ? formatDate(event.startAt.slice(0, 10))
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="admin-empty">Event not found.</p>
          )}
        </DetailSectionCard>

        <DetailSectionCard title="Payment verification" icon={Ticket}>
          <TicketOrderActions
            orderId={order.id}
            paymentStatus={order.paymentStatus}
            initialAdminNotes={order.adminNotes}
          />
        </DetailSectionCard>

        {order.paymentStatus === "paid" && order.ticketCode && event ? (
          <DetailSectionCard title="Issued ticket" icon={Ticket}>
            <EventTicketPass
              data={{
                eventTitle: event.title,
                startAt: event.startAt,
                venueName: event.venueName,
                coverImage: event.coverImage,
                posterImage: event.posterImage,
                ticketTypeName: order.ticketTypeName,
                currency: order.currency,
                unitPrice: Number(order.unitPrice),
                quantity: order.quantity,
                guestName: order.fullName,
                reference: order.reference,
                ticketCode: order.ticketCode,
              }}
            />
          </DetailSectionCard>
        ) : null}

        {order.adminNotes ? (
          <DetailSectionCard title="Admin notes" icon={StickyNote}>
            <p className="page-sub">{order.adminNotes}</p>
          </DetailSectionCard>
        ) : null}
      </div>
    </DetailPageShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketOrderByReference } from "@/lib/event-tickets";
import {
  formatEventDate,
  formatEventTimeRange,
} from "@/app/events/lib";
import { TicketOrderClient } from "./ticket-order-client";
import "../../events.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return {
    title: `Ticket ${reference.toUpperCase()} | Highbury Lounge`,
    robots: { index: false, follow: false },
  };
}

export default async function TicketOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const result = await getTicketOrderByReference(reference);
  if (!result?.order || !result.event) notFound();

  const { order, event, bank } = result;
  const paid = order.paymentStatus === "paid";
  const qrPayload = order.ticketCode || order.reference;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`;

  return (
    <main className="event-ticket-page">
      <nav className="event-detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/events">Events</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/events/${event.slug}`}>{event.title}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{order.reference}</span>
      </nav>

      <section className="event-ticket-card">
        <p className="eyebrow">{paid ? "Your ticket" : "Pending payment"}</p>
        <h1>{event.title}</h1>
        <p className="muted">
          {formatEventDate(event.startAt, { withWeekday: true, withYear: true })}
          {" · "}
          {formatEventTimeRange(event.startAt, event.endAt)}
          {event.venueName ? ` · ${event.venueName}` : ""}
        </p>

        <dl className="event-ticket-facts">
          <div>
            <dt>Reference</dt>
            <dd className="event-ticket-ref">{order.reference}</dd>
          </div>
          <div>
            <dt>Guest</dt>
            <dd>{order.fullName}</dd>
          </div>
          <div>
            <dt>Tickets</dt>
            <dd>
              {order.quantity}× {order.ticketTypeName}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>
              {order.currency} {Number(order.totalAmount).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span
                className={`event-ticket-status is-${order.paymentStatus}`}
              >
                {order.paymentStatus}
              </span>
            </dd>
          </div>
        </dl>

        {paid && order.ticketCode ? (
          <div className="event-ticket-qr-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR code for ${order.ticketCode}`} width={220} height={220} />
            <p>
              Ticket code: <strong>{order.ticketCode}</strong>
            </p>
            <p className="muted">Show this code at the door.</p>
            <p className="muted" style={{ marginTop: 12 }}>
              Need this again later?{" "}
              <Link href="/events/tickets/find">Find my ticket</Link>
            </p>
          </div>
        ) : order.paymentStatus === "cancelled" ? (
          <p className="form-error">This order was cancelled.</p>
        ) : (
          <div className="event-ticket-pending">
            <div className="event-ticket-bank">
              <h2>How to pay</h2>
              <p>
                Deposit{" "}
                <strong>
                  {order.currency} {Number(order.totalAmount).toFixed(2)}
                </strong>{" "}
                using reference{" "}
                <strong className="event-ticket-ref">{order.reference}</strong>.
              </p>
              <p>
                <strong>{bank.bankName}</strong>
                <br />
                {bank.accountName}
                <br />
                Branch: {bank.bankBranch}
              </p>
              <p>
                USD account: <strong>{bank.accountUsd}</strong>
                <br />
                ZW account: <strong>{bank.accountZw}</strong>
              </p>
              {bank.extraInstructions ? (
                <p className="muted">{bank.extraInstructions}</p>
              ) : null}
              {bank.reservationsEmail ? (
                <p className="muted">
                  Send proof of payment to{" "}
                  <a href={`mailto:${bank.reservationsEmail}`}>
                    {bank.reservationsEmail}
                  </a>
                  .
                </p>
              ) : null}
            </div>

            <div className="event-ticket-actions">
              <TicketOrderClient reference={order.reference} />
              <p className="muted event-ticket-help">
                Lost this page later?{" "}
                <Link href="/events/tickets/find">Find my ticket</Link>
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

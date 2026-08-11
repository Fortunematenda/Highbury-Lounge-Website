import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
import { listTicketOrders } from "@/lib/event-tickets";
import { TicketOrdersList, type TicketOrderRow } from "./tickets-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function AdminEventTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["content_manager"]);
  const params = await searchParams;
  const status = params.status ?? "";
  const eventId = Number(params.eventId ?? "");
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const all = await listTicketOrders({
    eventId: Number.isFinite(eventId) && eventId > 0 ? eventId : undefined,
    status: status || undefined,
  });

  const rows: TicketOrderRow[] = all
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((row) => ({
      id: row.order.id,
      reference: row.order.reference,
      fullName: row.order.fullName,
      email: row.order.email,
      phone: row.order.phone,
      ticketTypeName: row.order.ticketTypeName,
      quantity: row.order.quantity,
      totalAmount: row.order.totalAmount,
      currency: row.order.currency,
      paymentStatus: row.order.paymentStatus,
      createdAt: row.order.createdAt,
      eventId: row.order.eventId,
      eventTitle: row.eventTitle,
      eventStartAt: row.eventStartAt,
    }));

  const qs = (extra: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (Number.isFinite(eventId) && eventId > 0) sp.set("eventId", String(eventId));
    for (const [k, v] of Object.entries(extra)) sp.set(k, String(v));
    return sp.toString();
  };

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Operations</p>
          <h1>Event Tickets</h1>
          <p className="pms-page-sub">
            Verify bank transfers and issue tickets
          </p>
        </div>
      </header>

      <form className="admin-filters" method="get">
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="cancelled">cancelled</option>
        </select>
        {Number.isFinite(eventId) && eventId > 0 ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : null}
        <button className="admin-btn" type="submit">
          Filter
        </button>
        {Number.isFinite(eventId) && eventId > 0 ? (
          <Link className="admin-btn secondary" href="/admin/events/tickets">
            Clear event filter
          </Link>
        ) : null}
      </form>

      <section className="admin-card">
        <TicketOrdersList rows={rows} />
        <div className="admin-pagination">
          {page > 1 ? (
            <Link href={`/admin/events/tickets?${qs({ page: page - 1 })}`}>
              Previous
            </Link>
          ) : null}
          <span>Page {page}</span>
          {rows.length === PAGE_SIZE ? (
            <Link href={`/admin/events/tickets?${qs({ page: page + 1 })}`}>
              Next
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

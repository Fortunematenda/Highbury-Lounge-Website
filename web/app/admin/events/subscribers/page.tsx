import Link from "next/link";
import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "@/db";
import { eventSubscribers } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { PmsPageHeader, PmsStatusPill } from "@/app/admin/components/pms";
import { formatVenueDateTime } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function EventSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["content_manager"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const db = getDb();
  const filters = [];
  if (status === "active" || status === "unsubscribed") {
    filters.push(eq(eventSubscribers.status, status));
  }
  if (q) filters.push(like(eventSubscribers.email, `%${q}%`));

  const rows = await db
    .select()
    .from(eventSubscribers)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(eventSubscribers.subscribedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const qs = (extra: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    for (const [k, v] of Object.entries(extra)) sp.set(k, String(v));
    return sp.toString();
  };

  return (
    <div className="admin-page pms-page">
      <PmsPageHeader
        eyebrow="Content"
        title="Event Subscribers"
        subtitle="People who opted in for event announcements"
      />

      <form className="admin-filters" method="get">
        <input
          className="admin-input"
          name="q"
          placeholder="Search email"
          defaultValue={q}
        />
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All subscribers</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <button className="admin-btn" type="submit">
          Filter
        </button>
      </form>

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Source</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No subscribers match your filters.</td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>
                      <PmsStatusPill
                        label={s.status === "active" ? "Active" : "Unsubscribed"}
                        tone={s.status === "active" ? "success" : "neutral"}
                      />
                    </td>
                    <td>{s.source}</td>
                    <td>{formatVenueDateTime(s.subscribedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          {page > 1 && (
            <Link href={`/admin/events/subscribers?${qs({ page: page - 1 })}`}>
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {rows.length === PAGE_SIZE && (
            <Link href={`/admin/events/subscribers?${qs({ page: page + 1 })}`}>
              Next
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

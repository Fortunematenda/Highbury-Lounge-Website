import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
import { getAnalyticsSummary } from "@/lib/analytics";
import { formatVenueDateTime } from "@/lib/timezone";
import { AnalyticsChart } from "./analytics-chart";

export const dynamic = "force-dynamic";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatVenueDateTime(iso, { withSeconds: true });
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdminPage(["administrator", "content_manager", "booking_manager"]);
  const params = await searchParams;
  const daysRaw = Number(params.days || "30");
  const days = [7, 14, 30, 90].includes(daysRaw) ? daysRaw : 30;

  let summary: Awaited<ReturnType<typeof getAnalyticsSummary>>;
  try {
    summary = await getAnalyticsSummary(days);
  } catch (error) {
    console.error("[admin/analytics]", error);
    summary = {
      rangeDays: days,
      today: { pageViews: 0, visitors: 0 },
      week: { pageViews: 0, visitors: 0 },
      period: { pageViews: 0, visitors: 0 },
      byDay: [],
      topPages: [],
      topReferrers: [],
      recent: [],
    };
  }

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Management</p>
          <h1>Website analytics</h1>
          <p className="pms-page-sub">
            First-party visitor counts for the public Highbury Lounge site
          </p>
        </div>
        <div className="admin-filters" style={{ margin: 0 }}>
          {[7, 14, 30, 90].map((n) => (
            <Link
              key={n}
              className={`admin-btn ${days === n ? "" : "secondary"}`}
              href={`/admin/analytics?days=${n}`}
            >
              {n}d
            </Link>
          ))}
        </div>
      </header>

      <div className="admin-stat-grid analytics-stat-grid">
        <section className="admin-card analytics-stat-card">
          <p className="page-sub">Visitors today</p>
          <strong className="analytics-stat-value">{summary.today.visitors}</strong>
          <p className="page-sub">{summary.today.pageViews} page views</p>
        </section>
        <section className="admin-card analytics-stat-card">
          <p className="page-sub">Visitors (7 days)</p>
          <strong className="analytics-stat-value">{summary.week.visitors}</strong>
          <p className="page-sub">{summary.week.pageViews} page views</p>
        </section>
        <section className="admin-card analytics-stat-card">
          <p className="page-sub">Visitors ({days} days)</p>
          <strong className="analytics-stat-value">{summary.period.visitors}</strong>
          <p className="page-sub">{summary.period.pageViews} page views</p>
        </section>
      </div>

      <section className="admin-card" style={{ marginBottom: 18 }}>
        <h2>Traffic trend</h2>
        <AnalyticsChart data={summary.byDay} />
      </section>

      <div className="admin-two-col" style={{ marginBottom: 18 }}>
        <section className="admin-card">
          <h2>Top pages</h2>
          {summary.topPages.length === 0 ? (
            <p className="admin-empty">No pages tracked yet.</p>
          ) : (
            <ul className="admin-list">
              {summary.topPages.map((row) => (
                <li key={row.path}>
                  <strong>{row.path}</strong>
                  <span className="muted">
                    {" "}
                    · {row.pageViews} views · {row.visitors} visitors
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="admin-card">
          <h2>Top referrers</h2>
          {summary.topReferrers.length === 0 ? (
            <p className="admin-empty">No referrers yet.</p>
          ) : (
            <ul className="admin-list">
              {summary.topReferrers.map((row) => (
                <li key={row.referrer}>
                  <strong style={{ wordBreak: "break-all" }}>{row.referrer}</strong>
                  <span className="muted"> · {row.pageViews} views</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-card">
        <h2>Recent page views</h2>
        {summary.recent.length === 0 ? (
          <p className="admin-empty">
            Waiting for the first public visit. Open the website homepage to
            start collecting data.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Path</th>
                  <th>Title</th>
                  <th>Country</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Referrer</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.createdAt)}</td>
                    <td>{row.path}</td>
                    <td>{row.title || "—"}</td>
                    <td>{row.country || "—"}</td>
                    <td className="analytics-mono">{row.ip || "—"}</td>
                    <td>{row.device || "—"}</td>
                    <td style={{ maxWidth: 200, wordBreak: "break-all" }}>
                      {row.referrer || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

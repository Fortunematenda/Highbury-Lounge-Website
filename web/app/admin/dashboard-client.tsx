"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BedDouble,
  CalendarCheck2,
  ClipboardList,
  Loader2,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Building2,
  CircleHelp,
} from "lucide-react";
import { formatMoney } from "@/lib/format";

type TrendPoint = { date: string; value: number };
type Comparison = { change: number | null; label: string };

type DashboardData = {
  greetingName: string;
  range: number;
  totals: {
    bookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    availableRooms: number;
    occupancyRate: number;
    revenue: number;
    conferenceRequests: number;
    foodPreorders: number;
    occupiedRooms: number;
    totalRooms: number;
  };
  comparisons: {
    bookings: Comparison;
    revenue: Comparison;
    conference: Comparison;
    occupancy: Comparison;
  };
  trends: {
    bookingTrend: TrendPoint[];
    revenueTrend: TrendPoint[];
    occupancyTrend: TrendPoint[];
    conferenceTrend: TrendPoint[];
    preorderTrend: TrendPoint[];
  };
  bookingStatusBreakdown: Array<{ status: string; count: number }>;
  revenueSources: Array<{ source: string; amount: number }>;
  recentBookings: Array<{
    id: number;
    reference: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    roomName: string | null;
    firstName: string | null;
    lastName: string | null;
  }>;
  recentNotifications: Array<{
    id: number;
    title: string;
    message: string;
    type: string;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  today: string;
};

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "12 months" },
] as const;

const CHART_COLORS = ["#70163f", "#a91f62", "#c47a2c", "#4b6b58", "#64748b", "#1d4ed8"];

function greetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Sparkline({
  data,
  type,
  color,
  label,
}: {
  data: TrendPoint[];
  type: "area" | "line" | "bar";
  color: string;
  label: string;
}) {
  if (!data.length) {
    return <div className="admin-kpi-spark empty" aria-hidden />;
  }
  return (
    <div className="admin-kpi-spark" aria-label={label}>
      <ResponsiveContainer width="100%" height={44}>
        {type === "bar" ? (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  comparison,
  icon: Icon,
  spark,
  sparkType,
  color,
  tip,
}: {
  title: string;
  value: string | number;
  comparison?: Comparison;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  spark: TrendPoint[];
  sparkType: "area" | "line" | "bar";
  color: string;
  tip: string;
}) {
  const up = comparison?.change != null && comparison.change > 0;
  const down = comparison?.change != null && comparison.change < 0;
  return (
    <article className="admin-kpi-card" title={tip}>
      <div className="admin-kpi-head">
        <div>
          <p className="admin-kpi-title">
            {title}
            <span className="admin-kpi-tip" title={tip} aria-label={tip}>
              <CircleHelp size={13} aria-hidden />
            </span>
          </p>
          <strong className="admin-kpi-value">{value}</strong>
        </div>
        <span className="admin-kpi-icon" style={{ color }}>
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <div className="admin-kpi-meta">
        {comparison?.change == null ? (
          <span className="admin-kpi-compare muted">{comparison?.label ?? "Not enough comparison data"}</span>
        ) : (
          <span className={`admin-kpi-compare${up ? " up" : ""}${down ? " down" : ""}`}>
            {up ? <TrendingUp size={14} aria-hidden /> : null}
            {down ? <TrendingDown size={14} aria-hidden /> : null}
            {comparison.label}
          </span>
        )}
      </div>
      <Sparkline data={spark} type={sparkType} color={color} label={`${title} trend`} />
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="admin-kpi-grid" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="admin-kpi-card skeleton" />
      ))}
    </div>
  );
}

export function AdminDashboardClient() {
  const [range, setRange] = useState(30);
  const [overviewMode, setOverviewMode] = useState<"bookings" | "revenue">("bookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch(`/api/admin/dashboard?range=${range}`, { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
          if (!cancelled) setData(json);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "Failed to load dashboard",
            );
            setData(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [range]);

  const overviewData = useMemo(() => {
    if (!data) return [];
    return overviewMode === "bookings"
      ? data.trends.bookingTrend
      : data.trends.revenueTrend;
  }, [data, overviewMode]);

  const occupancyBars = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Rooms",
        occupied: data.totals.occupiedRooms,
        available: data.totals.availableRooms,
      },
    ];
  }, [data]);

  return (
    <div className="admin-page admin-dashboard">
      <header className="admin-dash-greeting">
        <div>
          <h1>
            {greetingForHour()}, {data?.greetingName ?? "there"}
          </h1>
          <p className="page-sub">
            Live operations overview for Highbury Lounge
            {data?.today ? ` · ${data.today}` : ""}
          </p>
        </div>
        <div className="admin-range-tabs" role="group" aria-label="Date range">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`admin-range-tab${range === item.value ? " is-selected" : ""}`}
              onClick={() => setRange(item.value)}
              aria-pressed={range === item.value}
            >
              <span className="admin-range-full">{item.label}</span>
              <span className="admin-range-short" aria-hidden>
                {item.value === 365 ? "1Y" : `${item.value}D`}
              </span>
            </button>
          ))}
        </div>
      </header>

      {loading && !data ? <SkeletonGrid /> : null}
      {error ? (
        <div className="admin-card admin-state error" role="alert">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="admin-kpi-grid">
            <KpiCard
              title="Total bookings"
              value={data.totals.bookings}
              comparison={data.comparisons.bookings}
              icon={ClipboardList}
              spark={data.trends.bookingTrend}
              sparkType="line"
              color="#70163f"
              tip="All room bookings in the system"
            />
            <KpiCard
              title="Confirmed bookings"
              value={data.totals.confirmedBookings}
              icon={CalendarCheck2}
              spark={data.trends.bookingTrend}
              sparkType="area"
              color="#15803d"
              tip="Bookings currently marked Confirmed"
            />
            <KpiCard
              title="Pending bookings"
              value={data.totals.pendingBookings}
              icon={ClipboardList}
              spark={data.trends.bookingTrend}
              sparkType="line"
              color="#b45309"
              tip="Bookings awaiting confirmation"
            />
            <KpiCard
              title="Occupancy rate"
              value={`${data.totals.occupancyRate}%`}
              comparison={data.comparisons.occupancy}
              icon={BedDouble}
              spark={data.trends.occupancyTrend}
              sparkType="bar"
              color="#1d4ed8"
              tip="Checked-in rooms versus inventory"
            />
            <KpiCard
              title="Total revenue"
              value={formatMoney(data.totals.revenue)}
              comparison={data.comparisons.revenue}
              icon={Wallet}
              spark={data.trends.revenueTrend}
              sparkType="area"
              color="#a91f62"
              tip="Sum of confirmed, checked-in, and checked-out booking totals"
            />
            <KpiCard
              title="Conference requests"
              value={data.totals.conferenceRequests}
              comparison={data.comparisons.conference}
              icon={Building2}
              spark={data.trends.conferenceTrend}
              sparkType="area"
              color="#7c3aed"
              tip="Total conference enquiries received"
            />
            <KpiCard
              title="Food pre-orders"
              value={data.totals.foodPreorders}
              icon={UtensilsCrossed}
              spark={data.trends.preorderTrend}
              sparkType="line"
              color="#c47a2c"
              tip="Food pre-order volume when available"
            />
            <KpiCard
              title="Available rooms"
              value={data.totals.availableRooms}
              icon={BedDouble}
              spark={data.trends.occupancyTrend}
              sparkType="bar"
              color="#4b6b58"
              tip="Estimated rooms not currently checked in"
            />
          </div>

          <div className="admin-chart-grid">
            <section className="admin-card admin-chart-card">
              <div className="admin-card-head">
                <h2>Booking and revenue overview</h2>
                <div className="admin-range-tabs compact">
                  <button
                    type="button"
                    className={`admin-range-tab${overviewMode === "bookings" ? " is-selected" : ""}`}
                    onClick={() => setOverviewMode("bookings")}
                    aria-pressed={overviewMode === "bookings"}
                  >
                    Bookings
                  </button>
                  <button
                    type="button"
                    className={`admin-range-tab${overviewMode === "revenue" ? " is-selected" : ""}`}
                    onClick={() => setOverviewMode("revenue")}
                    aria-pressed={overviewMode === "revenue"}
                  >
                    Revenue
                  </button>
                </div>
              </div>
              {overviewData.every((p) => p.value === 0) ? (
                <p className="admin-empty">No data for this period.</p>
              ) : (
                <div className="admin-chart-body" aria-label="Booking and revenue chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={overviewData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} width={48} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#70163f"
                        fill="#70163f"
                        fillOpacity={0.15}
                        name={overviewMode === "bookings" ? "Bookings" : "Revenue"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-card admin-chart-card">
              <div className="admin-card-head">
                <h2>Occupancy overview</h2>
              </div>
              {data.totals.totalRooms === 0 ? (
                <p className="admin-empty">No room inventory configured.</p>
              ) : (
                <div className="admin-chart-body" aria-label="Occupancy chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={occupancyBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="occupied" stackId="a" fill="#70163f" name="Occupied" />
                      <Bar dataKey="available" stackId="a" fill="#d6c7cf" name="Available" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-card admin-chart-card">
              <div className="admin-card-head">
                <h2>Booking status breakdown</h2>
              </div>
              {data.bookingStatusBreakdown.length === 0 ? (
                <p className="admin-empty">No bookings yet.</p>
              ) : (
                <div className="admin-chart-body" aria-label="Booking status chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.bookingStatusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.bookingStatusBreakdown.map((entry, index) => (
                          <Cell
                            key={entry.status}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="admin-chart-legend">
                    {data.bookingStatusBreakdown.map((row, index) => (
                      <li key={row.status}>
                        <span
                          style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        {row.status} ({row.count})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="admin-card admin-chart-card">
              <div className="admin-card-head">
                <h2>Revenue sources</h2>
              </div>
              {data.revenueSources.every((s) => s.amount === 0) ? (
                <p className="admin-empty">No revenue recorded yet.</p>
              ) : (
                <div className="admin-chart-body" aria-label="Revenue sources chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.revenueSources} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="source"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                      <Bar dataKey="amount" fill="#a91f62" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <div className="admin-two-col">
            <section className="admin-card">
              <div className="admin-card-head">
                <h2>Recent bookings</h2>
                <Link href="/admin/bookings">View all</Link>
              </div>
              {data.recentBookings.length === 0 ? (
                <p className="admin-empty">No bookings yet.</p>
              ) : (
                <ul className="admin-list">
                  {data.recentBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link href={`/admin/bookings/${booking.id}`}>
                        {booking.reference}
                      </Link>{" "}
                      — {booking.firstName} {booking.lastName} · {booking.roomName} ·{" "}
                      {booking.status} · {formatMoney(booking.totalAmount, booking.currency)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <h2>Recent notifications</h2>
                <Link href="/admin/notifications">View all</Link>
              </div>
              {data.recentNotifications.length === 0 ? (
                <p className="admin-empty">No notifications yet.</p>
              ) : (
                <ul className="admin-list">
                  {data.recentNotifications.map((item) => (
                    <li key={item.id} className={item.isRead ? undefined : "is-unread"}>
                      {item.actionUrl ? (
                        <Link href={item.actionUrl}>{item.title}</Link>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      <div>{item.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="admin-quick-actions">
            <Link className="admin-btn" href="/admin/bookings">
              View bookings
            </Link>
            <Link className="admin-btn secondary" href="/admin/rooms/new">
              Add room
            </Link>
            <Link className="admin-btn secondary" href="/admin/blocks">
              Block room
            </Link>
            <Link className="admin-btn secondary" href="/admin/calendar">
              Calendar
            </Link>
            <Link className="admin-btn secondary" href="/admin/menus">
              Update menu
            </Link>
          </div>
        </>
      ) : null}

      {loading && data ? (
        <p className="admin-inline-loading">
          <Loader2 size={14} className="spin" aria-hidden /> Refreshing…
        </p>
      ) : null}
    </div>
  );
}

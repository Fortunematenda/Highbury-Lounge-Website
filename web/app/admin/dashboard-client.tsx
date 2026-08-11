"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarCheck2,
  ClipboardList,
  Loader2,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  CircleHelp,
  Ban,
} from "lucide-react";
import { formatMoney } from "@/lib/format";

const DashboardCharts = lazy(() =>
  import("./dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
);

type TrendPoint = { date: string; value: number };
type Comparison = { change: number | null; label: string };

type AvailableRoomRow = {
  id: number;
  roomNumber: string;
  name: string;
  roomType: string;
  capacity: number;
  price: number;
  status: "Available" | "Limited" | "Full" | "Maintenance";
  roomsRemaining: number;
  inventoryCount: number;
  nextBooking: string | null;
};

type DashboardData = {
  greetingName: string;
  range: string;
  rangeLabel: string;
  totals: {
    bookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    availableRooms: number;
    occupancyRate: number;
    revenue: number;
    conferenceRequests: number;
    foodPreorders: number;
    pendingFoodOrders: number;
    preparingFoodOrders: number;
    readyFoodOrders: number;
    todayBookings: number;
    occupiedRooms: number;
    maintenanceRooms: number;
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
  availableRoomList: AvailableRoomRow[];
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
  recentFoodOrders?: Array<{
    id: number;
    reference: string;
    status: string;
    guestName: string | null;
    totalAmount: number;
    currency: string;
    createdAt: string;
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
  { value: "today", label: "Today", short: "Today" },
  { value: "7", label: "7 Days", short: "7D" },
  { value: "30", label: "30 Days", short: "30D" },
  { value: "month", label: "This Month", short: "Month" },
  { value: "year", label: "This Year", short: "Year" },
] as const;

function greetingForHour(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Harare",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
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
  const [Chart, setChart] = useState<React.ComponentType<{
    data: TrendPoint[];
    type: "area" | "line" | "bar";
    color: string;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./dashboard-charts").then((mod) => {
      if (!cancelled) setChart(() => mod.SparklineChart);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data.length) {
    return <div className="admin-kpi-spark empty" aria-hidden />;
  }
  if (!Chart) {
    return <div className="admin-kpi-spark empty" aria-hidden />;
  }
  return (
    <div className="admin-kpi-spark" aria-label={label}>
      <Chart data={data} type={type} color={color} />
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
              <CircleHelp size={12} aria-hidden />
            </span>
          </p>
          <strong className="admin-kpi-value">{value}</strong>
        </div>
        <span className="admin-kpi-icon" style={{ color }}>
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <div className="admin-kpi-meta">
        {comparison?.change == null ? (
          <span className="admin-kpi-compare muted">
            {comparison?.label ?? "Not enough comparison data"}
          </span>
        ) : (
          <span
            className={`admin-kpi-compare${up ? " up" : ""}${down ? " down" : ""}`}
          >
            {up ? <TrendingUp size={13} aria-hidden /> : null}
            {down ? <TrendingDown size={13} aria-hidden /> : null}
            {comparison.label}
          </span>
        )}
      </div>
      <Sparkline
        data={spark}
        type={sparkType}
        color={color}
        label={`${title} trend`}
      />
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
  const [range, setRange] = useState<string>("30");
  const [overviewMode, setOverviewMode] = useState<"bookings" | "revenue">(
    "bookings",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch(`/api/admin/dashboard?range=${encodeURIComponent(range)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Unable to load dashboard.");
          if (!cancelled) setData(json);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "Unable to load dashboard.",
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
        maintenance: data.totals.maintenanceRooms,
        available: data.totals.availableRooms,
      },
    ];
  }, [data]);

  const bookableRooms = useMemo(
    () =>
      (data?.availableRoomList ?? []).filter(
        (room) => room.status === "Available" || room.status === "Limited",
      ),
    [data],
  );

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

        <div className="admin-range-control">
          <label className="admin-range-select-wrap" htmlFor="admin-dash-range">
            <span className="sr-only">Date range</span>
            <select
              id="admin-dash-range"
              className="admin-range-select"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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
                <span className="admin-range-short">{item.short}</span>
              </button>
            ))}
          </div>
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
              title="Cancelled bookings"
              value={data.totals.cancelledBookings}
              icon={Ban}
              spark={data.trends.bookingTrend}
              sparkType="bar"
              color="#9f1239"
              tip="Cancelled and declined bookings"
            />
            <KpiCard
              title="Occupancy rate"
              value={`${data.totals.occupancyRate}%`}
              comparison={data.comparisons.occupancy}
              icon={BedDouble}
              spark={data.trends.occupancyTrend}
              sparkType="bar"
              color="#1d4ed8"
              tip="Occupied units versus active inventory for tonight"
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
              title="Today's bookings"
              value={data.totals.todayBookings}
              icon={CalendarCheck2}
              spark={data.trends.bookingTrend}
              sparkType="line"
              color="#70163f"
              tip="Bookings created today"
            />
            <KpiCard
              title="Pending food orders"
              value={data.totals.pendingFoodOrders}
              icon={UtensilsCrossed}
              spark={data.trends.preorderTrend}
              sparkType="line"
              color="#b45309"
              tip="Food orders awaiting kitchen start"
            />
            <KpiCard
              title="Orders preparing"
              value={data.totals.preparingFoodOrders}
              icon={UtensilsCrossed}
              spark={data.trends.preorderTrend}
              sparkType="bar"
              color="#c47a2c"
              tip="Food orders currently being prepared"
            />
            <KpiCard
              title="Ready for delivery"
              value={data.totals.readyFoodOrders}
              icon={UtensilsCrossed}
              spark={data.trends.preorderTrend}
              sparkType="area"
              color="#15803d"
              tip="Food orders ready to deliver"
            />
            <KpiCard
              title="Food pre-orders"
              value={data.totals.foodPreorders}
              icon={UtensilsCrossed}
              spark={data.trends.preorderTrend}
              sparkType="line"
              color="#c47a2c"
              tip="All food orders in the database"
            />
            <KpiCard
              title="Available rooms"
              value={data.totals.availableRooms}
              icon={BedDouble}
              spark={data.trends.occupancyTrend}
              sparkType="bar"
              color="#4b6b58"
              tip={`Active inventory (${data.totals.totalRooms}) − occupied (${data.totals.occupiedRooms}) − maintenance (${data.totals.maintenanceRooms})`}
            />
          </div>

          <Suspense
            fallback={
              <div className="admin-chart-grid">
                <div className="admin-card admin-chart-card skeleton" />
                <div className="admin-card admin-chart-card skeleton" />
              </div>
            }
          >
            <DashboardCharts
              overviewMode={overviewMode}
              onOverviewModeChange={setOverviewMode}
              overviewData={overviewData}
              occupancyBars={occupancyBars}
              bookingStatusBreakdown={data.bookingStatusBreakdown}
              revenueSources={data.revenueSources}
              totalRooms={data.totals.totalRooms}
            />
          </Suspense>

          <section className="admin-card admin-room-availability">
            <div className="admin-card-head">
              <div>
                <h2>Available rooms</h2>
                <p className="page-sub" style={{ margin: "4px 0 0" }}>
                  Tonight’s inventory after active bookings and maintenance
                  blocks
                </p>
              </div>
              <Link href="/admin/rooms">Manage rooms</Link>
            </div>
            {bookableRooms.length === 0 ? (
              <p className="admin-empty">No rooms available.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-room-table">
                  <thead>
                    <tr>
                      <th>Room #</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Next booking</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bookableRooms.map((room) => (
                      <tr key={room.id}>
                        <td>{room.roomNumber}</td>
                        <td>{room.name}</td>
                        <td>{room.roomType}</td>
                        <td>{room.capacity}</td>
                        <td>{formatMoney(room.price)}</td>
                        <td>
                          <span
                            className={`admin-room-status is-${room.status.toLowerCase()}`}
                          >
                            {room.status}
                            {room.roomsRemaining > 0
                              ? ` · ${room.roomsRemaining}/${room.inventoryCount}`
                              : ""}
                          </span>
                        </td>
                        <td>{room.nextBooking ?? "—"}</td>
                        <td>
                          <Link
                            className="admin-btn secondary"
                            href={`/admin/calendar?room=${room.id}`}
                          >
                            Book now
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-two-col">
            <section className="admin-card">
              <div className="admin-card-head">
                <h2>Recent bookings</h2>
                <Link href="/admin/bookings">View all</Link>
              </div>
              {data.recentBookings.length === 0 ? (
                <p className="admin-empty">No bookings found.</p>
              ) : (
                <ul className="admin-list">
                  {data.recentBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link href={`/admin/bookings/${booking.id}`}>
                        {booking.reference}
                      </Link>
                      {" · "}
                      {booking.firstName} {booking.lastName}
                      {" · "}
                      {booking.roomName}
                      {" · "}
                      {booking.status}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <h2>Recent food orders</h2>
                <Link href="/admin/food-orders">View all</Link>
              </div>
              {(data.recentFoodOrders ?? []).length === 0 ? (
                <p className="admin-empty">No food orders yet.</p>
              ) : (
                <ul className="admin-list">
                  {(data.recentFoodOrders ?? []).map((order) => (
                    <li key={order.id}>
                      <Link href={`/admin/food-orders/${order.id}`}>
                        {order.reference}
                      </Link>
                      {" · "}
                      {order.guestName || "Guest"}
                      {" · "}
                      {order.status}
                      {" · "}
                      {formatMoney(order.totalAmount, order.currency)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="admin-two-col">
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
                    <li
                      key={item.id}
                      className={item.isRead ? undefined : "is-unread"}
                    >
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

            <section className="admin-card">
              <div className="admin-card-head">
                <h2>Latest guest activity</h2>
                <Link href="/admin/guests">Guests</Link>
              </div>
              {data.recentBookings.length === 0 ? (
                <p className="admin-empty">No recent guest activity.</p>
              ) : (
                <ul className="admin-list">
                  {data.recentBookings.slice(0, 6).map((booking) => (
                    <li key={`guest-${booking.id}`}>
                      <Link href={`/admin/bookings/${booking.id}`}>
                        {booking.firstName} {booking.lastName}
                      </Link>
                      {" · "}
                      {booking.reference} · {booking.status}
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
            <Link className="admin-btn secondary" href="/admin/food-orders">
              Food orders
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

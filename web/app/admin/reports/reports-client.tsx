"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import {
  Download,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

const DashboardCharts = lazy(() =>
  import("../dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
);

type TrendPoint = { date: string; value: number };
type Comparison = { change: number | null; label: string };

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
    todayBookings: number;
    occupiedRooms: number;
    maintenanceRooms: number;
    totalRooms: number;
    upcomingEvents: number;
    pendingTicketOrders: number;
    paidTicketOrders: number;
    ticketsSold: number;
    ticketRevenue: number;
    pendingEventReservations: number;
    eventReservations: number;
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
    ticketTrend?: TrendPoint[];
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
  today: string;
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
] as const;

type ExportType =
  | "bookings"
  | "revenue"
  | "payments"
  | "food-orders"
  | "conference"
  | "tickets"
  | "visitors";

const EXPORTS: Array<{
  type: ExportType;
  label: string;
  hint: string;
}> = [
  {
    type: "bookings",
    label: "Bookings CSV",
    hint: "References, guests, rooms, stay dates, totals",
  },
  {
    type: "revenue",
    label: "Revenue by status",
    hint: "Booking revenue grouped by status",
  },
  {
    type: "payments",
    label: "Payments CSV",
    hint: "Recorded payment transactions",
  },
  {
    type: "food-orders",
    label: "Food orders CSV",
    hint: "Kitchen / dining pre-orders",
  },
  {
    type: "conference",
    label: "Conference CSV",
    hint: "Conference enquiries",
  },
  {
    type: "tickets",
    label: "Event tickets CSV",
    hint: "Ticket orders and payment status",
  },
  {
    type: "visitors",
    label: "Website visitors CSV",
    hint: "Recent page views with IP, country, device",
  },
];

function csvHref(
  type: ExportType,
  range: string,
  from: string,
  to: string,
) {
  const params = new URLSearchParams({ type });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (range) params.set("range", range);
  return `/api/admin/reports/csv?${params.toString()}`;
}

export function ReportsClient() {
  const [range, setRange] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overviewMode, setOverviewMode] = useState<"bookings" | "revenue">(
    "bookings",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ range });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    void fetch(`/api/admin/dashboard?${qs.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load reports.");
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load reports.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, from, to]);

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

  const periodBookingCount = useMemo(
    () =>
      data?.trends.bookingTrend.reduce((sum, row) => sum + row.value, 0) ?? 0,
    [data],
  );
  const periodRevenue = useMemo(
    () =>
      data?.trends.revenueTrend.reduce((sum, row) => sum + row.value, 0) ?? 0,
    [data],
  );

  const exportFrom = from || "";
  const exportTo = to || "";

  return (
    <div className="admin-page pms-page reports-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Management</p>
          <h1>Reports</h1>
          <p className="pms-page-sub">
            Booking, revenue, occupancy, and exportable admin reports
            {data?.rangeLabel ? ` · ${data.rangeLabel}` : ""}
          </p>
        </div>
      </header>

      <section className="admin-card reports-filters">
        <div className="admin-range-tabs" role="group" aria-label="Report range">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`admin-range-tab${range === item.value ? " is-selected" : ""}`}
              onClick={() => setRange(item.value)}
              aria-pressed={range === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="reports-date-fields">
          <label>
            <span>From</span>
            <input
              type="date"
              className="admin-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              className="admin-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear dates
            </button>
          )}
        </div>
      </section>

      {loading && !data ? (
        <div className="admin-card admin-state" aria-busy="true">
          <Loader2 className="spin" size={18} aria-hidden /> Loading reports…
        </div>
      ) : null}
      {error ? (
        <div className="admin-card admin-state error" role="alert">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="admin-stat-grid analytics-stat-grid">
            <section className="admin-card analytics-stat-card">
              <p className="page-sub">Bookings ({data.rangeLabel})</p>
              <strong className="analytics-stat-value">
                {periodBookingCount}
              </strong>
              <p className="page-sub">
                {data.totals.confirmedBookings} confirmed all-time ·{" "}
                {data.totals.pendingBookings} pending
              </p>
            </section>
            <section className="admin-card analytics-stat-card">
              <p className="page-sub">Revenue ({data.rangeLabel})</p>
              <strong className="analytics-stat-value">
                {formatMoney(periodRevenue)}
              </strong>
              <p className="page-sub">
                Confirmed / checked-in / checked-out in range
              </p>
            </section>
            <section className="admin-card analytics-stat-card">
              <p className="page-sub">Occupancy tonight</p>
              <strong className="analytics-stat-value">
                {data.totals.occupancyRate}%
              </strong>
              <p className="page-sub">
                {data.totals.occupiedRooms} occupied ·{" "}
                {data.totals.availableRooms} available
              </p>
            </section>
            <section className="admin-card analytics-stat-card">
              <p className="page-sub">Other activity</p>
              <strong className="analytics-stat-value">
                {data.totals.foodPreorders + data.totals.ticketsSold}
              </strong>
              <p className="page-sub">
                {data.totals.foodPreorders} food · {data.totals.ticketsSold}{" "}
                tickets · {data.totals.conferenceRequests} conference
              </p>
            </section>
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

          <section className="admin-card reports-export-card">
            <div className="admin-card-head">
              <h2>
                <FileSpreadsheet size={18} aria-hidden /> Pull reports
              </h2>
            </div>
            <p className="page-sub" style={{ marginBottom: 14 }}>
              Download CSV files for accounting and operations. Optional From/To
              dates above filter bookings, payments, and visitor exports.
            </p>
            <div className="reports-export-grid">
              {EXPORTS.map((item) => (
                <a
                  key={item.type}
                  className="reports-export-link"
                  href={csvHref(item.type, range, exportFrom, exportTo)}
                >
                  <Download size={16} aria-hidden />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Recent bookings</h2>
              <Link className="admin-btn secondary" href="/admin/bookings">
                Open bookings
              </Link>
            </div>
            {data.recentBookings.length === 0 ? (
              <p className="admin-empty">
                No bookings in the system yet. New bookings will appear here and
                in the charts above.
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Check-in</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <Link href={`/admin/bookings/${b.id}`}>
                            {b.reference}
                          </Link>
                        </td>
                        <td>
                          {[b.firstName, b.lastName].filter(Boolean).join(" ") ||
                            "—"}
                        </td>
                        <td>{b.roomName || "—"}</td>
                        <td>{b.status}</td>
                        <td>{b.checkIn}</td>
                        <td>{formatMoney(b.totalAmount, b.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="page-sub" style={{ marginTop: 10 }}>
              Range {data.rangeLabel}
              {data.today ? ` · as of ${data.today}` : ""}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

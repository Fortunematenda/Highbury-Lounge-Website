"use client";

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
import { formatMoney } from "@/lib/format";

type TrendPoint = { date: string; value: number };

const CHART_COLORS = [
  "#70163f",
  "#a91f62",
  "#c47a2c",
  "#4b6b58",
  "#64748b",
  "#1d4ed8",
];

export function SparklineChart({
  data,
  type,
  color,
}: {
  data: TrendPoint[];
  type: "area" | "line" | "bar";
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
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
  );
}

export function DashboardCharts({
  overviewMode,
  onOverviewModeChange,
  overviewData,
  occupancyBars,
  bookingStatusBreakdown,
  revenueSources,
  totalRooms,
}: {
  overviewMode: "bookings" | "revenue";
  onOverviewModeChange: (mode: "bookings" | "revenue") => void;
  overviewData: TrendPoint[];
  occupancyBars: Array<{
    name: string;
    occupied: number;
    maintenance: number;
    available: number;
  }>;
  bookingStatusBreakdown: Array<{ status: string; count: number }>;
  revenueSources: Array<{ source: string; amount: number }>;
  totalRooms: number;
}) {
  return (
    <div className="admin-chart-grid">
      <section className="admin-card admin-chart-card">
        <div className="admin-card-head">
          <h2>Booking and revenue overview</h2>
          <div className="admin-range-tabs compact">
            <button
              type="button"
              className={`admin-range-tab${overviewMode === "bookings" ? " is-selected" : ""}`}
              onClick={() => onOverviewModeChange("bookings")}
              aria-pressed={overviewMode === "bookings"}
            >
              Bookings
            </button>
            <button
              type="button"
              className={`admin-range-tab${overviewMode === "revenue" ? " is-selected" : ""}`}
              onClick={() => onOverviewModeChange("revenue")}
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
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <AreaChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
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
        {totalRooms === 0 ? (
          <p className="admin-empty">No room inventory configured.</p>
        ) : (
          <div className="admin-chart-body" aria-label="Occupancy chart">
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <BarChart data={occupancyBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                <Tooltip />
                <Bar dataKey="occupied" stackId="a" fill="#70163f" name="Occupied" />
                <Bar
                  dataKey="maintenance"
                  stackId="a"
                  fill="#c47a2c"
                  name="Maintenance"
                />
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
        {bookingStatusBreakdown.length === 0 ? (
          <p className="admin-empty">No bookings found.</p>
        ) : (
          <div className="admin-chart-body" aria-label="Booking status chart">
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <PieChart>
                <Pie
                  data={bookingStatusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius="40%"
                  outerRadius="70%"
                  paddingAngle={2}
                >
                  {bookingStatusBreakdown.map((entry, index) => (
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
              {bookingStatusBreakdown.map((row, index) => (
                <li key={row.status}>
                  <span
                    style={{
                      background: CHART_COLORS[index % CHART_COLORS.length],
                    }}
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
        {revenueSources.every((s) => s.amount === 0) ? (
          <p className="admin-empty">No revenue recorded yet.</p>
        ) : (
          <div className="admin-chart-body" aria-label="Revenue sources chart">
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <BarChart
                data={revenueSources}
                layout="vertical"
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="source"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value ?? 0))}
                />
                <Bar dataKey="amount" fill="#a91f62" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

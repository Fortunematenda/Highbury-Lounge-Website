"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DayPoint = { date: string; pageViews: number; visitors: number };

export function AnalyticsChart({ data }: { data: DayPoint[] }) {
  if (data.length === 0) {
    return <p className="page-sub">No visitor data in this range yet.</p>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#70163f" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#70163f" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="pageViews"
            name="Page views"
            stroke="#70163f"
            fill="url(#viewsFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visitors"
            stroke="#c47a2c"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

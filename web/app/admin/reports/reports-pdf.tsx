"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { FileText, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

type TrendPoint = { date: string; value: number };

export type ReportsPdfData = {
  rangeLabel: string;
  today: string;
  periodBookings: number;
  periodRevenue: number;
  occupancyRate: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  totalRooms: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  foodPreorders: number;
  ticketsSold: number;
  ticketRevenue: number;
  conferenceRequests: number;
  bookingTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
  bookingStatusBreakdown: Array<{ status: string; count: number }>;
  revenueSources: Array<{ source: string; amount: number }>;
  recentBookings: Array<{
    reference: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    roomName: string | null;
    guestName: string;
  }>;
};

const CHART_COLORS = [
  "#70163f",
  "#a91f62",
  "#c47a2c",
  "#4b6b58",
  "#64748b",
  "#1d4ed8",
];

function shortDate(iso: string) {
  if (!iso || iso.length < 10) return iso;
  return iso.slice(5);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function captureElement(el: HTMLElement) {
  const previous = {
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    right: el.style.right,
    transform: el.style.transform,
    opacity: el.style.opacity,
    zIndex: el.style.zIndex,
    pointerEvents: el.style.pointerEvents,
    visibility: el.style.visibility,
  };

  // Full-opacity on-screen capture (opacity < 1 was washing out the PDF).
  // A white cover hides the flash from the admin.
  const cover = document.createElement("div");
  cover.setAttribute("data-reports-pdf-cover", "1");
  cover.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;background:#ffffff;";
  document.body.appendChild(cover);

  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.right = "auto";
  el.style.transform = "none";
  el.style.opacity = "1";
  el.style.visibility = "visible";
  el.style.zIndex = "2147483645";
  el.style.pointerEvents = "none";

  await wait(900);
  try {
    return await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: Math.max(el.scrollWidth, 900),
      height: Math.max(el.scrollHeight, 1),
      style: {
        opacity: "1",
        transform: "none",
        background: "#ffffff",
      },
    });
  } catch (firstError) {
    console.warn("toPng failed, retrying", firstError);
    await wait(500);
    return toPng(el, {
      cacheBust: true,
      pixelRatio: 1.5,
      backgroundColor: "#ffffff",
      width: Math.max(el.scrollWidth, 900),
      height: Math.max(el.scrollHeight, 1),
      style: {
        opacity: "1",
        transform: "none",
        background: "#ffffff",
      },
    });
  } finally {
    cover.remove();
    el.style.position = previous.position;
    el.style.left = previous.left;
    el.style.top = previous.top;
    el.style.right = previous.right;
    el.style.transform = previous.transform;
    el.style.opacity = previous.opacity;
    el.style.zIndex = previous.zIndex;
    el.style.pointerEvents = previous.pointerEvents;
    el.style.visibility = previous.visibility;
  }
}

async function downloadPdfFromElement(el: HTMLElement, filename: string) {
  const dataUrl = await captureElement(el);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load report image"));
    img.src = dataUrl;
  });

  const imgWidthPx = img.width;
  const imgHeightPx = img.height;
  const pxPerMm = imgWidthPx / usableWidth;
  const pageHeightPx = usableHeight * pxPerMm;

  let offsetPx = 0;
  let page = 0;
  while (offsetPx < imgHeightPx) {
    if (page > 0) pdf.addPage();
    const sliceCanvas = document.createElement("canvas");
    const sliceHeight = Math.min(pageHeightPx, imgHeightPx - offsetPx);
    sliceCanvas.width = imgWidthPx;
    sliceCanvas.height = Math.max(1, Math.floor(sliceHeight));
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      img,
      0,
      offsetPx,
      imgWidthPx,
      sliceHeight,
      0,
      0,
      imgWidthPx,
      sliceHeight,
    );
    const sliceData = sliceCanvas.toDataURL("image/png");
    const sliceHeightMm = sliceHeight / pxPerMm;
    pdf.addImage(sliceData, "PNG", margin, margin, usableWidth, sliceHeightMm);
    offsetPx += pageHeightPx;
    page += 1;
    if (page > 20) break;
  }

  pdf.save(filename);
}

function ReportsPdfLayout({ data }: { data: ReportsPdfData }) {
  const bookingTrend = data.bookingTrend.map((p) => ({
    ...p,
    label: shortDate(p.date),
  }));
  const revenueTrend = data.revenueTrend.map((p) => ({
    ...p,
    label: shortDate(p.date),
  }));
  const occupancyBars = [
    {
      name: "Rooms",
      occupied: data.occupiedRooms,
      maintenance: data.maintenanceRooms,
      available: data.availableRooms,
    },
  ];

  return (
    <div className="reports-pdf-sheet">
      <header className="reports-pdf-header">
        <div>
          <p className="reports-pdf-eyebrow">Highbury Lounge · Kadoma</p>
          <h1>Operations report</h1>
          <p className="reports-pdf-sub">
            Period: {data.rangeLabel}
            {data.today ? ` · Generated ${data.today}` : ""}
          </p>
        </div>
        <div className="reports-pdf-brand">PDF report</div>
      </header>

      <section className="reports-pdf-kpis">
        <div>
          <span>Bookings</span>
          <strong>{data.periodBookings}</strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>{formatMoney(data.periodRevenue)}</strong>
        </div>
        <div>
          <span>Occupancy</span>
          <strong>{data.occupancyRate}%</strong>
        </div>
        <div>
          <span>Tickets sold</span>
          <strong>{data.ticketsSold}</strong>
        </div>
      </section>

      <section className="reports-pdf-meta">
        <p>
          Confirmed {data.confirmedBookings} · Pending {data.pendingBookings} ·
          Cancelled {data.cancelledBookings}
        </p>
        <p>
          Food orders {data.foodPreorders} · Ticket revenue{" "}
          {formatMoney(data.ticketRevenue)} · Conference enquiries{" "}
          {data.conferenceRequests}
        </p>
        <p>
          Rooms: {data.occupiedRooms} occupied · {data.availableRooms} available
          · {data.maintenanceRooms} maintenance · {data.totalRooms} active
        </p>
      </section>

      <div className="reports-pdf-charts">
        <section className="reports-pdf-card">
          <h2>Bookings over time</h2>
          {bookingTrend.every((p) => p.value === 0) ? (
            <p className="reports-pdf-empty">No bookings in this period.</p>
          ) : (
            <div className="reports-pdf-chart">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bookingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Bookings"
                    stroke="#70163f"
                    fill="#70163f"
                    fillOpacity={0.16}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="reports-pdf-card">
          <h2>Revenue over time</h2>
          {revenueTrend.every((p) => p.value === 0) ? (
            <p className="reports-pdf-empty">No confirmed revenue in this period.</p>
          ) : (
            <div className="reports-pdf-chart">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Revenue"
                    stroke="#a91f62"
                    fill="#a91f62"
                    fillOpacity={0.16}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="reports-pdf-card">
          <h2>Occupancy snapshot</h2>
          {data.totalRooms === 0 ? (
            <p className="reports-pdf-empty">No room inventory configured.</p>
          ) : (
            <div className="reports-pdf-chart">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={occupancyBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip />
                  <Bar
                    dataKey="occupied"
                    stackId="a"
                    fill="#70163f"
                    name="Occupied"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="maintenance"
                    stackId="a"
                    fill="#c47a2c"
                    name="Maintenance"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="available"
                    stackId="a"
                    fill="#d6c7cf"
                    name="Available"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="reports-pdf-card">
          <h2>Booking status breakdown</h2>
          {data.bookingStatusBreakdown.length === 0 ? (
            <p className="reports-pdf-empty">No bookings found.</p>
          ) : (
            <div className="reports-pdf-chart reports-pdf-pie-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.bookingStatusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    innerRadius="38%"
                    outerRadius="68%"
                    paddingAngle={2}
                    isAnimationActive={false}
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
              <ul className="reports-pdf-legend">
                {data.bookingStatusBreakdown.map((row, index) => (
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

        <section className="reports-pdf-card reports-pdf-card-wide">
          <h2>Revenue sources</h2>
          {data.revenueSources.every((s) => s.amount === 0) ? (
            <p className="reports-pdf-empty">No revenue recorded yet.</p>
          ) : (
            <div className="reports-pdf-chart">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={data.revenueSources}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee4ea" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="source"
                    width={110}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
                  <Bar
                    dataKey="amount"
                    fill="#a91f62"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="reports-pdf-card">
        <h2>Recent bookings</h2>
        {data.recentBookings.length === 0 ? (
          <p className="reports-pdf-empty">No bookings to list.</p>
        ) : (
          <table className="reports-pdf-table">
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
              {data.recentBookings.slice(0, 12).map((b) => (
                <tr key={b.reference}>
                  <td>{b.reference}</td>
                  <td>{b.guestName || "—"}</td>
                  <td>{b.roomName || "—"}</td>
                  <td>{b.status}</td>
                  <td>{b.checkIn}</td>
                  <td>{formatMoney(b.totalAmount, b.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="reports-pdf-footer">
        Highbury Lounge admin report · Confidential · {data.rangeLabel}
      </footer>
    </div>
  );
}

export function ReportsPdfButton({
  data,
  disabled,
}: {
  data: ReportsPdfData | null;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  // Keep the PDF layout mounted (offscreen) so charts are already painted.
  useEffect(() => {
    if (!data) {
      setChartsReady(false);
      return;
    }
    setChartsReady(false);
    const timer = window.setTimeout(() => setChartsReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [data]);

  async function onDownload() {
    if (!data || busy || disabled) return;
    const host = hostRef.current;
    const el = host?.querySelector(".reports-pdf-sheet") as HTMLElement | null;
    if (!host || !el) {
      toast.error("PDF layout is still preparing. Try again in a second.");
      return;
    }

    setBusy(true);
    const hostPrev = {
      left: host.style.left,
      top: host.style.top,
      transform: host.style.transform,
      opacity: host.style.opacity,
      zIndex: host.style.zIndex,
      visibility: host.style.visibility,
    };
    try {
      // Unclip the offscreen host so the sheet can paint at full opacity.
      host.style.left = "0";
      host.style.top = "0";
      host.style.transform = "none";
      host.style.opacity = "1";
      host.style.visibility = "visible";
      host.style.zIndex = "2147483644";

      if (!chartsReady) await wait(900);
      const stamp = data.today || new Date().toISOString().slice(0, 10);
      const safeRange = data.rangeLabel.replace(/[^\w\-]+/g, "_").slice(0, 40);
      await downloadPdfFromElement(
        el,
        `highbury-report-${safeRange}-${stamp}.pdf`,
      );
      toast.success("PDF report downloaded");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not create PDF report",
      );
    } finally {
      host.style.left = hostPrev.left;
      host.style.top = hostPrev.top;
      host.style.transform = hostPrev.transform;
      host.style.opacity = hostPrev.opacity;
      host.style.zIndex = hostPrev.zIndex;
      host.style.visibility = hostPrev.visibility;
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="admin-btn reports-pdf-btn"
        disabled={!data || busy || disabled}
        onClick={() => void onDownload()}
      >
        {busy ? (
          <Loader2 className="spin" size={16} aria-hidden />
        ) : (
          <FileText size={16} aria-hidden />
        )}
        {busy ? "Building PDF…" : "Download PDF report"}
      </button>

      {data ? (
        <div className="reports-pdf-offscreen" aria-hidden ref={hostRef}>
          <ReportsPdfLayout data={data} />
        </div>
      ) : null}
    </>
  );
}

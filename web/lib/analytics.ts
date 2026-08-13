import { and, desc, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sitePageViews } from "@/db/schema";
import { nowUtcIso, todayVenueDate } from "@/lib/timezone";

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|headless/i;

export function isBotUserAgent(ua: string | null | undefined) {
  if (!ua) return false;
  return BOT_RE.test(ua);
}

export function normalizeTrackedPath(raw: string) {
  let path = String(raw || "/").trim() || "/";
  try {
    if (path.startsWith("http")) path = new URL(path).pathname;
  } catch {
    /* ignore */
  }
  path = path.split("?")[0].split("#")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 300) path = path.slice(0, 300);
  return path;
}

export function shouldTrackPath(path: string) {
  if (!path || path === "/") return true;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/uploads")) return false;
  if (path.startsWith("/_")) return false;
  if (path.startsWith("/assets")) return false;
  if (/\.(js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|txt|xml)$/i.test(path)) {
    return false;
  }
  return true;
}

/** Friendly device label from User-Agent (no extra deps). */
export function detectDevice(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const s = ua.slice(0, 400);
  const isBot = BOT_RE.test(s);
  if (isBot) return "Bot";

  let form = "Desktop";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s)) form = "Tablet";
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini/i.test(s)) {
    form = "Mobile";
  }

  let browser = "Browser";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) browser = "Safari";

  let os = "";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return [form, os, browser].filter(Boolean).join(" · ").slice(0, 80);
}

/**
 * Normalize client IP for storage (strip ports / brackets; cap length).
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (!ip || ip.toLowerCase() === "unknown") return null;
  // "[::1]:1234" or "1.2.3.4:5678"
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 0) ip = ip.slice(1, end);
  } else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) {
    ip = ip.split(":")[0];
  }
  ip = ip.slice(0, 64);
  // Never persist Docker / LAN hops
  if (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    ip.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return null;
  }
  return ip;
}

/**
 * Venue calendar date YYYY-MM-DD, shifted by `days` (negative = past).
 * Works for SQLite CURRENT_TIMESTAMP and ISO created_at via substr(...,1,10).
 */
function venueDateOffset(days: number): string {
  const today = todayVenueDate();
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Compare calendar date portion only — avoids ISO `T` vs SQLite space mismatch. */
function createdOnOrAfter(dateYmd: string) {
  return sql`substr(${sitePageViews.createdAt}, 1, 10) >= ${dateYmd}`;
}

export async function recordPageView(input: {
  visitorId: string;
  path: string;
  referrer?: string | null;
  title?: string | null;
  userAgent?: string | null;
  country?: string | null;
  ip?: string | null;
  device?: string | null;
}) {
  const path = normalizeTrackedPath(input.path);
  if (!shouldTrackPath(path)) return null;
  if (isBotUserAgent(input.userAgent)) return null;

  const visitorId = String(input.visitorId || "")
    .trim()
    .slice(0, 64);
  if (!visitorId) return null;

  const ua = input.userAgent?.trim().slice(0, 300) || null;
  const device =
    input.device?.trim().slice(0, 80) || detectDevice(ua) || null;

  const db = getDb();
  const [row] = await db
    .insert(sitePageViews)
    .values({
      visitorId,
      path,
      referrer: input.referrer?.trim().slice(0, 500) || null,
      title: input.title?.trim().slice(0, 200) || null,
      userAgent: ua,
      country: input.country?.trim().toUpperCase().slice(0, 8) || null,
      ip: normalizeIp(input.ip),
      device,
      createdAt: nowUtcIso(),
    })
    .returning({ id: sitePageViews.id });
  return row;
}

export async function getAnalyticsSummary(days = 30) {
  const db = getDb();
  const since = venueDateOffset(-(Math.max(1, days) - 1));
  const todayStart = venueDateOffset(0);
  const weekStart = venueDateOffset(-6);

  const [totals] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(createdOnOrAfter(since));

  const [today] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(createdOnOrAfter(todayStart));

  const [week] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(createdOnOrAfter(weekStart));

  const byDay = await db
    .select({
      date: sql<string>`substr(${sitePageViews.createdAt}, 1, 10)`,
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(createdOnOrAfter(since))
    .groupBy(sql`substr(${sitePageViews.createdAt}, 1, 10)`)
    .orderBy(sql`substr(${sitePageViews.createdAt}, 1, 10)`);

  const topPages = await db
    .select({
      path: sitePageViews.path,
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(createdOnOrAfter(since))
    .groupBy(sitePageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(15);

  const topReferrers = await db
    .select({
      referrer: sitePageViews.referrer,
      pageViews: sql<number>`count(*)`.mapWith(Number),
    })
    .from(sitePageViews)
    .where(
      and(
        createdOnOrAfter(since),
        sql`${sitePageViews.referrer} is not null and ${sitePageViews.referrer} != ''`,
      ),
    )
    .groupBy(sitePageViews.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const recent = await db
    .select({
      id: sitePageViews.id,
      path: sitePageViews.path,
      title: sitePageViews.title,
      referrer: sitePageViews.referrer,
      country: sitePageViews.country,
      ip: sitePageViews.ip,
      device: sitePageViews.device,
      userAgent: sitePageViews.userAgent,
      createdAt: sitePageViews.createdAt,
    })
    .from(sitePageViews)
    .orderBy(desc(sitePageViews.createdAt))
    .limit(40);

  return {
    rangeDays: days,
    today: {
      pageViews: today?.pageViews ?? 0,
      visitors: today?.visitors ?? 0,
    },
    week: {
      pageViews: week?.pageViews ?? 0,
      visitors: week?.visitors ?? 0,
    },
    period: {
      pageViews: totals?.pageViews ?? 0,
      visitors: totals?.visitors ?? 0,
    },
    byDay,
    topPages,
    topReferrers: topReferrers.map((r) => ({
      referrer: r.referrer || "(direct)",
      pageViews: r.pageViews,
    })),
    recent: recent.map((row) => ({
      ...row,
      device: row.device || detectDevice(row.userAgent),
    })),
  };
}

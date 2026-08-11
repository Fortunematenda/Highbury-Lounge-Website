import { and, desc, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sitePageViews } from "@/db/schema";

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

export async function recordPageView(input: {
  visitorId: string;
  path: string;
  referrer?: string | null;
  title?: string | null;
  userAgent?: string | null;
  country?: string | null;
}) {
  const path = normalizeTrackedPath(input.path);
  if (!shouldTrackPath(path)) return null;
  if (isBotUserAgent(input.userAgent)) return null;

  const visitorId = String(input.visitorId || "")
    .trim()
    .slice(0, 64);
  if (!visitorId) return null;

  const db = getDb();
  const [row] = await db
    .insert(sitePageViews)
    .values({
      visitorId,
      path,
      referrer: input.referrer?.trim().slice(0, 500) || null,
      title: input.title?.trim().slice(0, 200) || null,
      userAgent: input.userAgent?.trim().slice(0, 300) || null,
      country: input.country?.trim().slice(0, 8) || null,
    })
    .returning({ id: sitePageViews.id });
  return row;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getAnalyticsSummary(days = 30) {
  const db = getDb();
  const since = daysAgoIso(Math.max(0, days - 1));
  const todayStart = daysAgoIso(0);
  const weekStart = daysAgoIso(6);

  const [totals] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(gte(sitePageViews.createdAt, since));

  const [today] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(gte(sitePageViews.createdAt, todayStart));

  const [week] = await db
    .select({
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(gte(sitePageViews.createdAt, weekStart));

  const byDay = await db
    .select({
      date: sql<string>`substr(${sitePageViews.createdAt}, 1, 10)`,
      pageViews: sql<number>`count(*)`.mapWith(Number),
      visitors: sql<number>`count(distinct ${sitePageViews.visitorId})`.mapWith(
        Number,
      ),
    })
    .from(sitePageViews)
    .where(gte(sitePageViews.createdAt, since))
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
    .where(gte(sitePageViews.createdAt, since))
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
        gte(sitePageViews.createdAt, since),
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
      createdAt: sitePageViews.createdAt,
    })
    .from(sitePageViews)
    .orderBy(desc(sitePageViews.createdAt))
    .limit(25);

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
    recent,
  };
}

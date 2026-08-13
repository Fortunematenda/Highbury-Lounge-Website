import { cookies } from "next/headers";
import {
  detectDevice,
  isBotUserAgent,
  normalizeIp,
  normalizeTrackedPath,
  recordPageView,
  shouldTrackPath,
} from "@/lib/analytics";
import { jsonError } from "@/lib/format";

const recentHits = new Map<string, number>();
const countryCache = new Map<string, string | null>();
const VISITOR_COOKIE = "hl_vid";

function newVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function countryFromHeaders(request: Request): string | null {
  const raw =
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cloudfront-viewer-country") ||
    request.headers.get("x-country-code") ||
    null;
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  return code.slice(0, 8);
}

function isPublicIp(ip: string | null): boolean {
  if (!ip) return false;
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") return false;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) {
    return false;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  return true;
}

/** Best-effort country from public IP when CDN headers are absent (e.g. Contabo). */
async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!isPublicIp(ip) || !ip) return null;
  if (countryCache.has(ip)) return countryCache.get(ip) ?? null;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/country_code/`,
      {
        signal: ctrl.signal,
        headers: { Accept: "text/plain" },
      },
    );
    clearTimeout(timer);
    if (!res.ok) {
      countryCache.set(ip, null);
      return null;
    }
    const text = (await res.text()).trim().toUpperCase();
    const code = /^[A-Z]{2}$/.test(text) ? text : null;
    countryCache.set(ip, code);
    return code;
  } catch {
    countryCache.set(ip, null);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent") || "";
    if (isBotUserAgent(ua)) {
      return Response.json({ ok: true, skipped: "bot" });
    }

    const body = (await request.json().catch(() => ({}))) as {
      path?: string;
      referrer?: string;
      title?: string;
      visitorId?: string;
    };

    const path = normalizeTrackedPath(body.path || "/");
    if (!shouldTrackPath(path)) {
      return Response.json({ ok: true, skipped: "path" });
    }

    const jar = await cookies();
    let visitorId =
      body.visitorId?.trim() || jar.get(VISITOR_COOKIE)?.value || "";
    if (!visitorId || visitorId.length < 8) {
      visitorId = newVisitorId();
    }

    const ipRaw = clientIp(request);
    const ip = normalizeIp(ipRaw);
    const rateKey = `${ip || "unknown"}:${visitorId}`;
    const now = Date.now();
    const last = recentHits.get(rateKey) ?? 0;
    if (now - last < 800) {
      return Response.json({ ok: true, skipped: "rate", visitorId });
    }
    recentHits.set(rateKey, now);

    let country = countryFromHeaders(request);
    if (!country) {
      country = await lookupCountry(ip);
    }

    await recordPageView({
      visitorId,
      path,
      referrer: body.referrer || request.headers.get("referer"),
      title: body.title,
      userAgent: ua,
      country,
      ip,
      device: detectDevice(ua),
    });

    try {
      jar.set(VISITOR_COOKIE, visitorId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        httpOnly: false,
      });
    } catch {
      /* cookie may be read-only in some runtimes */
    }

    return Response.json({ ok: true, visitorId });
  } catch (error) {
    console.error(error);
    return jsonError("Unable to record page view.", 500);
  }
}

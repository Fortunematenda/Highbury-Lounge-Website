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
const VISITOR_COOKIE = "hl_vid";

function newVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function headerIp(request: Request): string | null {
  const raw =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  return normalizeIp(raw);
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

function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

function isPrivateOrLocal(ip: string | null): boolean {
  if (!ip) return true;
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
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
      ip?: string;
      country?: string;
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

    const fromHeaders = headerIp(request);
    const fromClient = normalizeIp(body.ip);
    // Prefer real public client IP (browser geo) when proxy only sees Docker/private hop
    const ip =
      (!isPrivateOrLocal(fromHeaders) ? fromHeaders : null) ||
      fromClient ||
      fromHeaders;

    const rateKey = `${ip || "unknown"}:${visitorId}`;
    const now = Date.now();
    const last = recentHits.get(rateKey) ?? 0;
    if (now - last < 800) {
      return Response.json({ ok: true, skipped: "rate", visitorId });
    }
    recentHits.set(rateKey, now);

    const country =
      countryFromHeaders(request) || normalizeCountry(body.country);

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

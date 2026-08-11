import { cookies } from "next/headers";
import {
  isBotUserAgent,
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

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rateKey = `${ip}:${visitorId}`;
    const now = Date.now();
    const last = recentHits.get(rateKey) ?? 0;
    if (now - last < 800) {
      return Response.json({ ok: true, skipped: "rate", visitorId });
    }
    recentHits.set(rateKey, now);

    const country =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      null;

    await recordPageView({
      visitorId,
      path,
      referrer: body.referrer || request.headers.get("referer"),
      title: body.title,
      userAgent: ua,
      country,
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

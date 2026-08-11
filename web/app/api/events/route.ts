import {
  getAnnouncementEvent,
  getFeaturedUpcoming,
  listPublishedPast,
  listPublishedUpcoming,
} from "@/lib/events";
import { jsonError } from "@/lib/format";
import { todayVenueDate } from "@/lib/timezone";

function weekRange() {
  const today = todayVenueDate();
  const [y, m, d] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

function monthRange() {
  const today = todayVenueDate();
  const [y, m] = today.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0));
  const to = last.toISOString().slice(0, 10);
  return { from, to };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") || "upcoming";
    const q = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const freeOnly = url.searchParams.get("free") === "1";
    const range = url.searchParams.get("range") || "";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "24") || 24));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || "0") || 0);
    const includeFeatured = url.searchParams.get("featured") === "1";
    const includeAnnouncement = url.searchParams.get("announcement") === "1";

    let from: string | undefined;
    let to: string | undefined;
    if (range === "week") {
      ({ from, to } = weekRange());
    } else if (range === "month") {
      ({ from, to } = monthRange());
    } else {
      from = url.searchParams.get("from") || undefined;
      to = url.searchParams.get("to") || undefined;
    }

    if (scope === "past") {
      const past = await listPublishedPast({ limit, offset });
      return Response.json({ events: past }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const [upcoming, featured, announcement] = await Promise.all([
      listPublishedUpcoming({ q, category, freeOnly, from, to, limit, offset }),
      includeFeatured ? getFeaturedUpcoming() : Promise.resolve(null),
      includeAnnouncement ? getAnnouncementEvent() : Promise.resolve(null),
    ]);

    return Response.json(
      { events: upcoming, featured, announcement },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load events.", 500);
  }
}

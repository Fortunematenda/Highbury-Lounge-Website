import {
  getAnnouncementEvent,
  getFeaturedUpcoming,
  listPublishedPast,
  listPublishedUpcoming,
} from "@/lib/events";
import { jsonError } from "@/lib/format";

function weekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

function monthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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

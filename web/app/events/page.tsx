import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getFeaturedUpcoming,
  listPublishedPast,
  listPublishedUpcoming,
} from "@/lib/events";
import { getSettingsMap } from "@/lib/settings";
import { todayVenueDate } from "@/lib/timezone";
import { EventsPageClient } from "./events-client";
import "./events.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events at Highbury Lounge · Kadoma",
  description:
    "Discover live music, dining nights and celebrations at Highbury Lounge in Kadoma. Browse upcoming events, reserve your table and relive past highlights.",
};

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

type SearchParams = {
  q?: string;
  category?: string;
  range?: string;
  free?: string;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";
  const range = params.range === "week" || params.range === "month" ? params.range : "";
  const freeOnly = params.free === "1";

  let from: string | undefined;
  let to: string | undefined;
  if (range === "week") ({ from, to } = weekRange());
  else if (range === "month") ({ from, to } = monthRange());

  const [upcoming, featured, past, settings] = await Promise.all([
    listPublishedUpcoming({
      q: q || undefined,
      category: category || undefined,
      freeOnly,
      from,
      to,
      limit: 24,
    }),
    getFeaturedUpcoming(),
    listPublishedPast({ limit: 6, offset: 0 }),
    getSettingsMap(),
  ]);

  const upcomingWithoutFeatured = featured
    ? upcoming.filter((event) => event.id !== featured.id)
    : upcoming;

  return (
    <Suspense fallback={null}>
      <EventsPageClient
        upcoming={upcomingWithoutFeatured}
        featured={featured}
        initialPast={past}
        filters={{ q, category, range, free: freeOnly }}
        whatsappNumber={settings.whatsapp}
      />
    </Suspense>
  );
}

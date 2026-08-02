import type { MetadataRoute } from "next";
import { listPublishedPast, listPublishedUpcoming } from "@/lib/events";

const SITE_URL = (process.env.SITE_URL || "https://www.highburylounge.com").replace(
  /\/$/,
  "",
);

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [upcoming, past] = await Promise.all([
    listPublishedUpcoming({ limit: 200 }),
    listPublishedPast({ limit: 200 }),
  ]);

  const seenSlugs = new Set<string>();
  const eventEntries: MetadataRoute.Sitemap = [];
  for (const event of [...upcoming, ...past]) {
    if (seenSlugs.has(event.slug)) continue;
    seenSlugs.add(event.slug);
    eventEntries.push({
      url: `${SITE_URL}/events/${event.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/conference`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/book`, changeFrequency: "monthly", priority: 0.6 },
  ];

  return [...staticEntries, ...eventEntries];
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedEventBySlug, getRelatedEvents } from "@/lib/events";
import { getSettingsMap } from "@/lib/settings";
import { EventDetailClient } from "./event-detail-client";
import "../events.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) {
    return { title: "Event Not Found · Highbury Lounge" };
  }

  const title = event.seoTitle || `${event.title} · Highbury Lounge Events`;
  const description =
    event.seoDescription ||
    event.shortDescription ||
    event.description?.slice(0, 160) ||
    "Join us at Highbury Lounge in Kadoma for an unforgettable evening.";
  const image = event.socialImage || "/images/events.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  const [related, settings] = await Promise.all([
    getRelatedEvents(event.id, event.category),
    getSettingsMap(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortDescription || event.description || undefined,
    startDate: event.startAt,
    endDate: event.endAt || undefined,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : event.status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: event.socialImage || event.coverImage || event.posterImage || undefined,
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venueAddress,
        addressLocality: "Kadoma",
        addressCountry: "ZW",
      },
    },
    performer: event.artistOrHost
      ? { "@type": "PerformingGroup", name: event.artistOrHost }
      : undefined,
    offers:
      event.entryType === "free"
        ? {
            "@type": "Offer",
            price: 0,
            priceCurrency: event.currency,
            availability:
              event.availability === "Sold Out"
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
          }
        : event.price != null
          ? {
              "@type": "Offer",
              price: event.price,
              priceCurrency: event.currency,
              availability:
                event.availability === "Sold Out"
                  ? "https://schema.org/SoldOut"
                  : "https://schema.org/InStock",
            }
          : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailClient
        event={event}
        related={related}
        whatsappNumber={settings.whatsapp}
      />
    </>
  );
}

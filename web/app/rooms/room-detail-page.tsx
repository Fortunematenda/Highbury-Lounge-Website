import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomDetailClient } from "@/app/components/RoomDetailClient";
import { getRelatedRooms, getRoomBySlug } from "@/lib/rooms";
import { getSettingsMap } from "@/lib/settings";
import "./rooms.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return { title: "Room Not Found · Highbury Lounge" };
  }

  const title = `${room.name} · Highbury Lounge`;
  const description =
    room.shortDescription ||
    room.description?.slice(0, 160) ||
    `Stay in the ${room.name} at Highbury Lounge in Kadoma.`;
  const image = room.featuredImage || "/images/deluxe-room.jpg";

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

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const [related, settings] = await Promise.all([
    getRelatedRooms(room.id),
    getSettingsMap(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: room.name,
    description: room.shortDescription || room.description || undefined,
    image: room.images,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: room.maxGuests,
    },
    bed: room.bedType || undefined,
    offers: {
      "@type": "Offer",
      price: room.effectivePrice,
      priceCurrency: room.currency || "USD",
      availability: "https://schema.org/InStock",
    },
    containedInPlace: {
      "@type": "LodgingBusiness",
      name: settings.business_name || "Highbury Lounge",
      address: settings.address || undefined,
      telephone: settings.phone || undefined,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RoomDetailClient
        room={room}
        related={related}
        whatsappNumber={settings.whatsapp || "+263786957068"}
        checkInTime={settings.check_in_time || "14:00"}
        checkOutTime={settings.check_out_time || "10:00"}
        cancellationPolicy={settings.cancellation_policy || ""}
      />
    </>
  );
}

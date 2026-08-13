import Link from "next/link";
import { RoomCard } from "@/app/components/rooms/RoomCard";
import { RoomsResultsScroll } from "@/app/components/rooms/RoomsResultsScroll";
import { RoomsSearchForm } from "@/app/components/rooms/RoomsSearchForm";
import { listPublicRooms } from "@/lib/rooms";
import { getSettingsMap } from "@/lib/settings";
import "./rooms.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rooms & Suites · Highbury Lounge",
  description:
    "Discover elegant rooms and suites at Highbury Lounge in Kadoma. Check availability and book your stay.",
  openGraph: {
    title: "Rooms & Suites · Highbury Lounge",
    description:
      "Discover elegant rooms and suites at Highbury Lounge in Kadoma.",
    images: [{ url: "/images/deluxe-room.jpg" }],
  },
};

type SearchParams = Promise<{
  checkIn?: string;
  checkOut?: string;
  guests?: string;
}>;

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = await searchParams;
  const guests = Math.max(1, Number(filters.guests) || 2);
  const checkIn = filters.checkIn?.trim() || "";
  const checkOut = filters.checkOut?.trim() || "";
  const settings = await getSettingsMap();

  const { rooms, error } = await listPublicRooms({
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    guests,
  });

  const heroImage =
    settings.hero_image ||
    rooms[0]?.featuredImage ||
    "/images/deluxe-room.jpg";
  const whatsapp = (settings.whatsapp || "+263786957068").replace(/\D/g, "");
  const searched = Boolean(checkIn && checkOut);

  return (
    <main className="hl-rooms-page">
      <RoomsResultsScroll active={searched} />
      <section
        className="hl-rooms-hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(36, 27, 31, 0.82), rgba(36, 27, 31, 0.28)), url('${heroImage}')`,
        }}
      >
        <div className="hl-rooms-container hl-rooms-hero-copy">
          <p className="eyebrow light">Stay at Highbury</p>
          <h1>Rooms designed for restful stays</h1>
          <p>
            Discover elegant accommodation, thoughtful comfort and warm
            hospitality in the heart of Kadoma.
          </p>
        </div>
      </section>

      <section className="hl-rooms-container hl-rooms-search-wrap">
        <RoomsSearchForm
          key={`${checkIn}-${checkOut}-${guests}`}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          compactWhenFilled={searched}
        />
      </section>

      <section
        id="rooms-results"
        className="hl-rooms-container hl-rooms-results"
        tabIndex={-1}
      >
        <div className="hl-rooms-results-head">
          <div>
            <p className="eyebrow">Our accommodation</p>
            <h2>Find your perfect room</h2>
            <p>
              Choose from comfortable rooms created for business trips,
              celebrations and relaxing escapes.
            </p>
          </div>
          <p className="hl-rooms-count">
            {searched
              ? `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} available for ${checkIn} → ${checkOut}`
              : `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}`}
          </p>
        </div>

        {error ? (
          <div className="hl-rooms-empty" role="alert">
            <h3>Unable to search those dates</h3>
            <p>{error}</p>
            <Link href="/rooms" className="button outline">
              Clear search
            </Link>
          </div>
        ) : null}

        {!error && rooms.length > 0 ? (
          <div className="hl-rooms-grid">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                checkIn={checkIn || undefined}
                checkOut={checkOut || undefined}
                guests={guests}
              />
            ))}
          </div>
        ) : null}

        {!error && rooms.length === 0 ? (
          <div className="hl-rooms-empty">
            <h3>No rooms found</h3>
            <p>
              Try changing your dates or guest count, or contact Highbury for
              assistance.
            </p>
            <div className="hl-rooms-empty-actions">
              <Link href="/rooms" className="button outline">
                Clear search
              </Link>
              <a
                className="button primary"
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Hello Highbury Lounge, I need help finding a room.",
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Contact Highbury
              </a>
            </div>
          </div>
        ) : null}
      </section>

      <section className="hl-rooms-trust">
        <div className="hl-rooms-container">
          <span>Best available rate</span>
          <span>Secure reservation</span>
          <span>Friendly local support</span>
        </div>
      </section>
    </main>
  );
}

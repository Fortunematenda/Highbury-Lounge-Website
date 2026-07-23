"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { CompactImageStrip } from "@/app/components/PreviewMediaGallery";
import { formatMoney } from "@/lib/format";

type AvailableRoom = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  effectivePrice: number;
  roomsRemaining: number;
  maxGuests: number;
  featuredImage: string | null;
  images: string[];
  amenities: string[];
  nights: number;
  estimatedTotal: number;
};

function RoomResultCard({
  room,
  checkIn,
  checkOut,
  adults,
  children,
  rooms,
}: {
  room: AvailableRoom;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  rooms: string;
}) {
  const gallery = [
    room.featuredImage,
    ...(room.images ?? []),
  ].filter(Boolean) as string[];
  const [activeImage, setActiveImage] = useState(
    gallery[0] || "/images/deluxe-room.jpg",
  );

  return (
    <article className="available-room">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage} alt={room.name} />
        {gallery.length > 1 ? (
          <CompactImageStrip
            images={gallery}
            alt={room.name}
            fallback="/images/deluxe-room.jpg"
            onOpen={setActiveImage}
          />
        ) : null}
      </div>
      <div>
        <span className="available-badge">{room.roomsRemaining} remaining</span>
        <h3>{room.name}</h3>
        <p>{room.shortDescription}</p>
        <p className="muted">
          Up to {room.maxGuests} guests · {room.nights} night
          {room.nights === 1 ? "" : "s"}
        </p>
        <div className="amenity-chips">
          {room.amenities.slice(0, 4).map((a) => (
            <span key={a}>✓ {a}</span>
          ))}
        </div>
        <strong>
          {formatMoney(room.effectivePrice)} <small>/ night</small>
        </strong>
        <p>
          Estimated total: <strong>{formatMoney(room.estimatedTotal)}</strong>
        </p>
      </div>
      <Link
        className="button primary"
        href={`/book?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}`}
      >
        Reserve now
      </Link>
    </article>
  );
}

function SearchResultsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");
  const [adults, setAdults] = useState(params.get("adults") ?? "2");
  const [children, setChildren] = useState(params.get("children") ?? "0");
  const [rooms, setRooms] = useState(params.get("rooms") ?? "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AvailableRoom[]>([]);

  const today = new Date().toISOString().split("T")[0];

  async function load(search: URLSearchParams) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/availability?${search.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const checkInP = params.get("checkIn");
    const checkOutP = params.get("checkOut");
    if (checkInP && checkOutP) {
      void load(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams({
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
    });
    router.push(`/rooms/search?${next.toString()}`);
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink href="/" label="Back to home" />
        <p className="eyebrow">Find your stay</p>
        <h1>Available rooms</h1>
        <form className="search-form" onSubmit={onSearch}>
          <label>
            Check-in
            <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
          </label>
          <label>
            Check-out
            <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </label>
          <label>
            Adults
            <input type="number" min={1} max={8} value={adults} onChange={(e) => setAdults(e.target.value)} required />
          </label>
          <label>
            Children
            <input type="number" min={0} max={8} value={children} onChange={(e) => setChildren(e.target.value)} required />
          </label>
          <label>
            Rooms
            <input type="number" min={1} max={5} value={rooms} onChange={(e) => setRooms(e.target.value)} required />
          </label>
          <button className="button primary" type="submit">
            Search
          </button>
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="muted">Checking live availability…</p>}

        {!loading && !error && results.length === 0 && checkIn && checkOut && (
          <div className="empty-state">
            <strong>No rooms available for these dates.</strong>
            <p>Try different dates, fewer guests, or fewer rooms.</p>
          </div>
        )}

        <div className="availability-list">
          {results.map((room) => (
            <RoomResultCard
              key={room.id}
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={adults}
              children={children}
              rooms={rooms}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function RoomSearchPage() {
  return (
    <Suspense fallback={<main className="booking-flow"><p>Loading…</p></main>}>
      <SearchResultsInner />
    </Suspense>
  );
}

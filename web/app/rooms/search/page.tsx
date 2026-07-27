"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { CompactImageStrip } from "@/app/components/PreviewMediaGallery";
import { formatMoney } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { LanguageSelector } from "@/lib/i18n/LanguageSelector";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

type AvailableRoom = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description?: string | null;
  translationsJson?: string | null;
  effectivePrice: number;
  currency?: string;
  roomsRemaining: number;
  maxGuests: number;
  bedType?: string | null;
  roomSize?: string | null;
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
  const { t, i18n } = useTranslation();
  const currency = room.currency || "USD";
  const localized = pickTranslated(
    i18n.language as AppLocale,
    {
      name: room.name,
      description: room.description,
      shortDescription: room.shortDescription,
    },
    room.translationsJson,
  );
  const gallery = [
    room.featuredImage,
    ...(room.images ?? []),
  ].filter(Boolean) as string[];
  const uniqueGallery = [...new Set(gallery)];
  const [activeImage, setActiveImage] = useState(
    uniqueGallery[0] || "/images/deluxe-room.jpg",
  );

  const metaParts = [
    t("booking.upToGuests", { count: room.maxGuests }),
    room.bedType || null,
    room.roomSize || null,
    `${room.nights} ${room.nights === 1 ? t("booking.night") : t("booking.nights")}`,
  ].filter(Boolean);

  return (
    <article className="available-room">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage} alt={localized.name} />
        {uniqueGallery.length > 1 ? (
          <CompactImageStrip
            images={uniqueGallery}
            alt={localized.name}
            fallback="/images/deluxe-room.jpg"
            onOpen={setActiveImage}
          />
        ) : null}
      </div>
      <div>
        <span className="available-badge">
          {room.roomsRemaining} {t("booking.remaining")}
        </span>
        <h3>{localized.name}</h3>
        <p>{localized.shortDescription || localized.description}</p>
        <p className="muted">{metaParts.join(" · ")}</p>
        {room.amenities.length > 0 ? (
          <div className="amenity-chips">
            {room.amenities.slice(0, 6).map((a) => (
              <span key={a}>✓ {a}</span>
            ))}
          </div>
        ) : null}
        <strong>
          {formatMoney(room.effectivePrice, currency, i18n.language)}{" "}
          <small>/ {t("booking.perNight")}</small>
        </strong>
        <p>
          {t("booking.estimatedTotalLabel")}:{" "}
          <strong>
            {formatMoney(room.estimatedTotal, currency, i18n.language)}
          </strong>
        </p>
      </div>
      <Link
        className="button primary"
        href={`/book?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}`}
      >
        {t("booking.reserveNow")}
      </Link>
    </article>
  );
}

function SearchResultsInner() {
  const { t } = useTranslation();
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
      const res = await fetch(`/api/availability?${search.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("validation.tryAgain"));
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : t("validation.tryAgain"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const checkInP = params.get("checkIn");
    const checkOutP = params.get("checkOut");
    setCheckIn(params.get("checkIn") ?? "");
    setCheckOut(params.get("checkOut") ?? "");
    setAdults(params.get("adults") ?? "2");
    setChildren(params.get("children") ?? "0");
    setRooms(params.get("rooms") ?? "1");
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
        <BackLink href="/" label={t("booking.backToHome")} />
        <LanguageSelector variant="panel" />
        <p className="eyebrow">{t("booking.findStay")}</p>
        <h1>{t("booking.availableRooms")}</h1>
        <form className="search-form" onSubmit={onSearch}>
          <label>
            {t("booking.checkIn")}
            <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
          </label>
          <label>
            {t("booking.checkOut")}
            <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </label>
          <label>
            {t("booking.adults")}
            <input type="number" min={1} max={8} value={adults} onChange={(e) => setAdults(e.target.value)} required />
          </label>
          <label>
            {t("booking.children")}
            <input type="number" min={0} max={8} value={children} onChange={(e) => setChildren(e.target.value)} required />
          </label>
          <label>
            {t("booking.rooms")}
            <input type="number" min={1} max={5} value={rooms} onChange={(e) => setRooms(e.target.value)} required />
          </label>
          <button className="button primary" type="submit">
            {t("booking.search")}
          </button>
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="muted">{t("booking.checkingAvailability")}</p>}

        {!loading && !error && results.length === 0 && checkIn && checkOut && (
          <div className="empty-state">
            <strong>{t("booking.noRoomsAvailable")}</strong>
            <p>{t("booking.tryDifferentDates")}</p>
          </div>
        )}

        {!loading && results.length > 0 ? (
          <p className="muted" style={{ marginBottom: 12 }}>
            {results.length === 1
              ? "1 room available from your inventory"
              : `${results.length} rooms available from your inventory`}
          </p>
        ) : null}

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

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <main className="booking-flow">
      <p>{t("booking.loading")}</p>
    </main>
  );
}

export default function RoomSearchPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchResultsInner />
    </Suspense>
  );
}

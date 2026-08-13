"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { CompactImageStrip } from "@/app/components/PreviewMediaGallery";
import { formatMoney, formatDate } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { todayISODate } from "@/lib/stay-dates";
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
    room.bedType || null,
    t("booking.upToGuests", { count: room.maxGuests }),
    room.roomSize || null,
    `${room.nights} ${room.nights === 1 ? t("booking.night") : t("booking.nights")}`,
  ].filter(Boolean);

  const short = (localized.shortDescription || "").trim();
  const long = (localized.description || "").trim();
  // Prefer prose copy; skip shortDescriptions that are just amenity/meta lines.
  const summary =
    short && !short.includes("·")
      ? short
      : long && long !== short
        ? long
        : "";

  return (
    <article className="available-room">
      <div className="available-room-media">
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

      <div className="available-room-copy">
        <span className="available-badge">
          {room.roomsRemaining} {t("booking.remaining")}
        </span>
        <h3>
          <Link href={`/rooms/${room.slug}`} className="available-room-title-link">
            {localized.name}
          </Link>
        </h3>
        {metaParts.length > 0 ? (
          <p className="available-room-meta">{metaParts.join(" · ")}</p>
        ) : null}
        {summary ? (
          <p className="available-room-summary">{summary}</p>
        ) : null}
        {room.amenities.length > 0 ? (
          <div className="amenity-chips">
            {room.amenities.slice(0, 6).map((a) => (
              <span key={a}>✓ {a}</span>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="available-room-pricing">
        <small>{t("booking.from")}</small>
        <strong>{formatMoney(room.effectivePrice, currency, i18n.language)}</strong>
        <span>{t("booking.perNight")}</span>
        <p className="available-room-total">
          {t("booking.estimatedTotalLabel")}
          <em>{formatMoney(room.estimatedTotal, currency, i18n.language)}</em>
        </p>
        <Link
          className="button primary"
          href={`/book?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}`}
        >
          {t("booking.reserveNow")}
        </Link>
      </aside>
    </article>
  );
}

function SearchResultsInner() {
  const { t, i18n } = useTranslation();
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
  const [editingSearch, setEditingSearch] = useState(
    !(params.get("checkIn") && params.get("checkOut")),
  );

  const today = todayISODate();

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
      setEditingSearch(false);
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
    setEditingSearch(false);
    router.push(`/rooms/search?${next.toString()}`);
  }

  const hasActiveSearch = Boolean(checkIn && checkOut);
  const showFullForm = editingSearch || !hasActiveSearch;

  return (
    <main className="booking-flow booking-flow--search">
      <section className="booking-flow-panel">
        <div className="booking-flow-top">
          <BackLink href="/" label={t("booking.backToHome")} />
        </div>
        <p className="eyebrow">{t("booking.findStay")}</p>
        <h1>{t("booking.availableRooms")}</h1>
        <p className="muted" style={{ marginTop: -8 }}>
          Already booked?{" "}
          <Link href="/book/find">Find my booking</Link> with your reference.
        </p>

        {hasActiveSearch && !showFullForm ? (
          <div className="search-summary">
            <div className="search-summary-copy">
              <p className="search-summary-dates">
                {formatDate(checkIn, i18n.language)} –{" "}
                {formatDate(checkOut, i18n.language)}
              </p>
              <p className="search-summary-meta">
                {adults} {t("booking.adults")} · {children}{" "}
                {t("booking.children")} · {rooms} {t("booking.rooms")}
              </p>
            </div>
            <button
              type="button"
              className="button outline"
              onClick={() => setEditingSearch(true)}
            >
              {t("booking.updateDates")}
            </button>
          </div>
        ) : null}

        {showFullForm ? (
        <form className="search-form" onSubmit={onSearch}>
          <label>
            {t("booking.checkIn")}
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </label>
          <label>
            {t("booking.checkOut")}
            <input
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </label>
          <label>
            {t("booking.adults")}
            <input
              type="number"
              min={1}
              max={8}
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              required
            />
          </label>
          <label>
            {t("booking.children")}
            <input
              type="number"
              min={0}
              max={8}
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              required
            />
          </label>
          <label>
            {t("booking.rooms")}
            <input
              type="number"
              min={1}
              max={5}
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              required
            />
          </label>
          <div className="search-form-actions">
            <button className="button primary" type="submit">
              {t("booking.search")}
            </button>
            {hasActiveSearch ? (
              <button
                className="button outline"
                type="button"
                onClick={() => {
                  setCheckIn(params.get("checkIn") ?? "");
                  setCheckOut(params.get("checkOut") ?? "");
                  setAdults(params.get("adults") ?? "2");
                  setChildren(params.get("children") ?? "0");
                  setRooms(params.get("rooms") ?? "1");
                  setEditingSearch(false);
                }}
              >
                {t("booking.cancelUpdate")}
              </button>
            ) : null}
          </div>
        </form>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="availability-status">{t("booking.checkingAvailability")}</p>
        ) : null}

        {!loading && !error && results.length === 0 && checkIn && checkOut ? (
          <div className="empty-state no-availability">
            <strong>{t("booking.noRoomsAvailable")}</strong>
            <p>{t("booking.tryDifferentDates")}</p>
          </div>
        ) : null}

        {!loading && results.length > 0 ? (
          <p className="availability-count">
            {results.length === 1
              ? t("booking.oneRoomAvailable")
              : t("booking.roomsAvailableCount", { count: results.length })}
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
    <main className="booking-flow booking-flow--search">
      <p className="availability-status">{t("booking.loading")}</p>
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

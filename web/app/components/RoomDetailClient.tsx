"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Images,
  Lock,
  Maximize2,
  MessageCircle,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { RoomCard } from "@/app/components/rooms/RoomCard";
import { nightsBetween, todayISODate } from "@/lib/stay-dates";
import { formatMoney } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";
import type { PublicRoomDetail, PublicRoomSummary } from "@/lib/rooms";

type Props = {
  room: PublicRoomDetail;
  related: PublicRoomSummary[];
  whatsappNumber: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
};

function whatsappHref(whatsapp: string, message: string) {
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits || "263786957068"}?text=${encodeURIComponent(message)}`;
}

function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RoomDetailClient({
  room,
  related,
  whatsappNumber,
  checkInTime,
  checkOutTime,
  cancellationPolicy,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as AppLocale;
  const router = useRouter();
  const today = todayISODate();

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDaysISO(today, 1));
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [formError, setFormError] = useState("");
  const [checking, setChecking] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const localized = useMemo(
    () =>
      pickTranslated(
        locale,
        {
          name: room.name,
          description: room.description,
          shortDescription: room.shortDescription,
        },
        room.translationsJson,
      ),
    [locale, room],
  );

  const gallery = room.gallery?.length
    ? room.gallery
    : room.images.map((url, index) => ({
        id: String(index),
        url,
        alt: localized.name,
      }));

  const mainImage = gallery[0];
  const sideImages = gallery.slice(1, 3);
  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? nightsBetween(checkIn, checkOut)
      : 0;
  const estimatedTotal =
    nights > 0 ? room.effectivePrice * nights : room.effectivePrice;

  const askHref = whatsappHref(
    whatsappNumber,
    t("rooms.whatsappAsk", { name: localized.name }),
  );

  const closeGallery = useCallback(() => setGalleryOpen(false), []);

  useEffect(() => {
    if (!galleryOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowRight") {
        setGalleryIndex((i) => (i + 1) % gallery.length);
      }
      if (event.key === "ArrowLeft") {
        setGalleryIndex((i) => (i - 1 + gallery.length) % gallery.length);
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.classList.add("has-room-gallery-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("has-room-gallery-open");
    };
  }, [galleryOpen, gallery.length, closeGallery]);

  async function onCheckAvailability(event: FormEvent) {
    event.preventDefault();
    if (!checkIn || !checkOut) {
      setFormError(t("validation.selectBothDates"));
      return;
    }
    if (checkIn < today) {
      setFormError(t("validation.selectBothDates"));
      return;
    }
    if (checkOut <= checkIn) {
      setFormError(t("validation.checkoutAfterCheckin"));
      return;
    }
    if (Number(adults) < 1) {
      setFormError(t("validation.atLeastOneAdult"));
      return;
    }

    setChecking(true);
    setFormError("");
    try {
      const qs = new URLSearchParams({
        checkIn,
        checkOut,
        adults,
        children,
        rooms: "1",
      });
      const res = await fetch(`/api/availability?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("validation.tryAgain"));
      }
      const match = (data.results ?? []).find(
        (item: { id: number }) => item.id === room.id,
      );
      if (!match) {
        setFormError(t("rooms.unavailableForDates"));
        return;
      }
      router.push(
        `/book?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=1`,
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("validation.tryAgain"),
      );
    } finally {
      setChecking(false);
    }
  }

  function openGallery(index: number) {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }

  return (
    <main className="hl-room-detail">
      <div className="hl-rooms-container hl-room-detail-top">
        <nav className="hl-room-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("rooms.breadcrumbHome")}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/rooms">{t("rooms.breadcrumbRooms")}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{localized.name}</span>
        </nav>
      </div>

      <div className="hl-room-stage">
        <div className="hl-rooms-container hl-room-hero-split">
          <div className="hl-room-hero-copy">
            <p className="eyebrow">{t("home.stayPreviewEyebrow")}</p>
            <h1>{localized.name}</h1>
            {(localized.description || localized.shortDescription) ? (
              <p className="hl-room-hero-desc">
                {localized.description || localized.shortDescription}
              </p>
            ) : null}
            <div className="hl-room-quickfacts">
              <span>
                <Users size={16} aria-hidden="true" />
                {t("rooms.upToGuests", { count: room.maxGuests })}
              </span>
              {room.bedType ? (
                <span>
                  <BedDouble size={16} aria-hidden="true" />
                  {room.bedType}
                </span>
              ) : null}
              {room.roomSize ? (
                <span>
                  <Maximize2 size={16} aria-hidden="true" />
                  {room.roomSize}
                </span>
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <button
                type="button"
                className="hl-room-hero-photos"
                onClick={() => openGallery(0)}
              >
                <Images size={16} aria-hidden="true" />
                {t("rooms.viewAllPhotos", { count: gallery.length })}
              </button>
            ) : null}
          </div>

          <section
            className={[
              "hl-room-gallery",
              sideImages.length === 0
                ? "is-single"
                : sideImages.length === 1
                  ? "is-pair"
                  : "is-collage",
            ].join(" ")}
          >
            <button
              type="button"
              className="hl-room-gallery-main"
              onClick={() => openGallery(0)}
              aria-label={t("rooms.openGallery")}
            >
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage.url}
                  alt={mainImage.alt || localized.name}
                />
              ) : (
                <span className="hl-room-gallery-empty">
                  {t("rooms.imageComingSoon")}
                </span>
              )}
            </button>

            {sideImages.length > 0 ? (
              <div
                className={`hl-room-gallery-side is-${sideImages.length}`}
              >
                {sideImages.map((image, index) => {
                  const photoIndex = index + 1;
                  const isLast = index === sideImages.length - 1;
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => openGallery(photoIndex)}
                      aria-label={`${localized.name} ${photoIndex + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt || localized.name}
                      />
                      {isLast && gallery.length > 3 ? (
                        <span className="hl-room-gallery-more">
                          {t("rooms.viewAllPhotos", { count: gallery.length })}
                          <Images size={15} aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        <div className="hl-rooms-container hl-room-stage-body">
        <section className="hl-room-layout">
          <article className="hl-room-content">
          {room.amenities.length > 0 ? (
            <div className="hl-room-section">
              <h2>{t("rooms.features")}</h2>
              <ul className="hl-room-amenities">
                {room.amenities.map((item) => (
                  <li key={item}>
                    <span>
                      <Check size={16} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="hl-room-section">
            <h2>{t("rooms.stayInformation")}</h2>
            <div className="hl-room-info-grid">
              <div>
                <Clock3 size={20} aria-hidden="true" />
                <h3>{t("rooms.checkInOut")}</h3>
                <p>
                  {t("booking.checkIn")}: {checkInTime || t("rooms.confirmWithHighbury")}
                  <br />
                  {t("booking.checkOut")}:{" "}
                  {checkOutTime || t("rooms.confirmWithHighbury")}
                </p>
              </div>
              <div>
                <h3>{t("rooms.cancellation")}</h3>
                <p>
                  {cancellationPolicy || t("rooms.cancellationFallback")}
                </p>
              </div>
            </div>
          </div>
        </article>

        <aside id="availability" className="hl-room-booking">
          <div className="hl-room-booking-card">
            <div className="hl-room-booking-price">
              <small>{t("booking.from")}</small>
              <div className="hl-room-booking-price-row">
                <strong>
                  {formatMoney(
                    room.effectivePrice,
                    room.currency,
                    i18n.language,
                  )}
                </strong>
                <span>/ {t("booking.night")}</span>
              </div>
            </div>

            <form onSubmit={onCheckAvailability} noValidate>
              <div className="hl-room-dates">
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
              </div>
              <div className="hl-room-guests">
                <label>
                  {t("booking.adults")}
                  <input
                    type="number"
                    min={1}
                    max={room.maxAdults || room.maxGuests}
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
                    max={room.maxChildren}
                    value={children}
                    onChange={(e) => setChildren(e.target.value)}
                  />
                </label>
              </div>

              {nights > 0 ? (
                <p className="hl-room-total">
                  {nights}{" "}
                  {nights === 1 ? t("booking.night") : t("booking.nights")} ·{" "}
                  {t("booking.estimatedTotalLabel")}{" "}
                  <strong>
                    {formatMoney(estimatedTotal, room.currency, i18n.language)}
                  </strong>
                </p>
              ) : null}

              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <button
                className="button primary"
                type="submit"
                disabled={checking}
              >
                {checking
                  ? t("booking.checkingAvailability")
                  : t("rooms.checkAvailability")}
              </button>
            </form>

            <a
              className="button outline hl-room-whatsapp"
              href={askHref}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" />
              {t("rooms.bookOnWhatsapp")}
            </a>

            <ul className="hl-room-trust">
              <li>
                <Tag size={16} aria-hidden="true" />
                {t("rooms.trustBestRate")}
              </li>
              <li>
                <Lock size={16} aria-hidden="true" />
                {t("rooms.trustSecure")}
              </li>
              <li>
                <ShieldCheck size={16} aria-hidden="true" />
                {t("rooms.trustNoPayment")}
              </li>
            </ul>

            <p className="hl-room-taxes-note">{t("rooms.taxesNote")}</p>
          </div>
        </aside>
        </section>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="hl-rooms-container hl-room-related">
          <div className="hl-room-related-head">
            <h2>{t("rooms.otherRooms")}</h2>
            <Link href="/rooms">{t("rooms.viewAllRooms")}</Link>
          </div>
          <div className="hl-rooms-grid is-related">
            {related.map((item) => (
              <RoomCard key={item.id} room={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="hl-room-mobile-bar">
        <div>
          <p>{localized.name}</p>
          <strong>
            {formatMoney(room.effectivePrice, room.currency, i18n.language)} /{" "}
            {t("booking.night")}
          </strong>
        </div>
        <a href="#availability" className="button primary">
          {t("rooms.checkDates")}
        </a>
      </div>

      {galleryOpen ? (
        <div
          className="hl-room-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("rooms.openGallery")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeGallery();
          }}
        >
          <button
            type="button"
            className="hl-room-lightbox-close"
            onClick={closeGallery}
            aria-label={t("home.closeRoomPreview")}
          >
            <X size={22} />
          </button>
          <button
            type="button"
            className="hl-room-lightbox-nav is-prev"
            onClick={() =>
              setGalleryIndex((i) => (i - 1 + gallery.length) % gallery.length)
            }
            aria-label="Previous image"
          >
            <ChevronLeft size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[galleryIndex]?.url}
            alt={gallery[galleryIndex]?.alt || localized.name}
          />
          <button
            type="button"
            className="hl-room-lightbox-nav is-next"
            onClick={() => setGalleryIndex((i) => (i + 1) % gallery.length)}
            aria-label="Next image"
          >
            <ChevronRight size={28} />
          </button>
          <p className="hl-room-lightbox-count">
            {galleryIndex + 1} / {gallery.length}
          </p>
        </div>
      ) : null}
    </main>
  );
}

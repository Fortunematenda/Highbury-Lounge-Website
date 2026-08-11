"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PublicMenuSection,
  type PublicMenuItem,
} from "@/app/components/PublicMenuSection";
import { PreviewMediaGallery } from "@/app/components/PreviewMediaGallery";
import {
  BookingSearchModal,
  OPEN_BOOKING_SEARCH_EVENT,
  isMobileBookingViewport,
} from "@/app/components/BookingSearchModal";
import { HomeUpcomingEvents } from "@/app/components/HomeUpcomingEvents";
import { formatMoney } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

type PublicFoodItem = PublicMenuItem & { category?: string };

const FOOD_SERVICE_KEYS = [
  "dineIn",
  "collection",
  "roomService",
  "conferenceCatering",
] as const;

type FoodServiceKey = (typeof FOOD_SERVICE_KEYS)[number];

const FOOD_SERVICE_I18N: Record<FoodServiceKey, string> = {
  dineIn: "menu.serviceDineIn",
  collection: "menu.serviceCollection",
  roomService: "menu.serviceRoomService",
  conferenceCatering: "menu.serviceConferenceCatering",
};

type ApiRoom = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  pricePerNight: number;
  promotionalPrice: number | null;
  maxGuests: number;
  bedType: string | null;
  featuredImage: string;
  images: string[];
  translationsJson?: string | null;
  isFeatured?: boolean;
};

type HomeRoom = {
  id: string;
  name: string;
  image: string;
  images: string[];
  price: number;
  capacity: number;
  /** Compact meta for cards, e.g. "King bed · 2 guests" */
  detail: string;
  /** Longer description for cards / listings */
  summary: string;
};

type ApiPackage = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  capacity: number;
  imageUrl: string | null;
  featuresJson: string | null;
  translationsJson?: string | null;
};

type HomeVenue = {
  id: string;
  packageId: number;
  name: string;
  image: string;
  detail: string;
  capacity: string;
  maxGuests: number;
  features: string[];
};

type PublicSettings = {
  business_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  hero_image: string;
  meet_image: string;
  celebrate_image: string;
  dine_image_1: string;
  dine_image_2: string;
};

type GalleryImage = {
  id: number;
  imageUrl: string;
  altText: string | null;
};

function parseFeatures(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // plain text from admin
  }
  return raw
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function whatsappHref(whatsapp: string, message?: string) {
  const digits = whatsapp.replace(/\D/g, "");
  const base = `https://wa.me/${digits || "263786957068"}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits || "+263786957068"}`;
}

function localIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultStayDates() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    checkIn: localIsoDate(start),
    checkOut: localIsoDate(end),
  };
}

export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as AppLocale;
  const stayDefaults = defaultStayDates();
  const [apiRooms, setApiRooms] = useState<ApiRoom[]>([]);
  const [apiPackages, setApiPackages] = useState<ApiPackage[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({
    business_name: "Highbury Lounge",
    address: "7504 Greenfield Cherries, Kadoma, Zimbabwe",
    phone: "+263 78 695 7068",
    whatsapp: "+263786957068",
    email: "test@higbury.com",
    hero_image: "/images/hero-venue.jpg",
    meet_image: "/images/conference.jpg",
    celebrate_image: "/images/events.jpg",
    dine_image_1: "/images/dining.jpg",
    dine_image_2: "/images/food.jpg",
  });
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [conferencePreview, setConferencePreview] = useState<HomeVenue | null>(null);
  const [foodPreview, setFoodPreview] = useState<PublicFoodItem | null>(null);
  const [foodOrderOpen, setFoodOrderOpen] = useState(false);
  const [foodOrderSubmitted, setFoodOrderSubmitted] = useState(false);
  const [selectedFood, setSelectedFood] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("1");
  const [foodOrderDate, setFoodOrderDate] = useState("");
  const [foodOrderTime, setFoodOrderTime] = useState("");
  const [foodService, setFoodService] = useState<FoodServiceKey>("dineIn");
  const [foodGuestName, setFoodGuestName] = useState("");
  const [foodGuestPhone, setFoodGuestPhone] = useState("");
  const [foodGuestEmail, setFoodGuestEmail] = useState("");
  const [foodBookingRef, setFoodBookingRef] = useState("");
  const [foodDietaryNotes, setFoodDietaryNotes] = useState("");
  const [foodSubmitting, setFoodSubmitting] = useState(false);
  const [foodSubmitError, setFoodSubmitError] = useState("");
  const [foodOrderReference, setFoodOrderReference] = useState("");
  const [checkIn, setCheckIn] = useState(stayDefaults.checkIn);
  const [checkOut, setCheckOut] = useState(stayDefaults.checkOut);
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [roomsCount, setRoomsCount] = useState("1");
  const [searchError, setSearchError] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [menuOptions, setMenuOptions] = useState<PublicFoodItem[]>([]);
  const checkInRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = (path: string) =>
      fetch(path, { cache: "no-store" }).then((r) => r.json());

    void load("/api/rooms")
      .then((data) => setApiRooms(data.rooms ?? []))
      .catch(() => setApiRooms([]));

    void load("/api/conference")
      .then((data) => setApiPackages(data.packages ?? []))
      .catch(() => setApiPackages([]));

    void load("/api/public-settings")
      .then((data) => {
        if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      })
      .catch(() => undefined);

    void load("/api/gallery")
      .then((data) => setGallery(data.images ?? []))
      .catch(() => setGallery([]));

    void load("/api/menu")
      .then((data) => {
        const flat: PublicFoodItem[] = (data.categories ?? []).flatMap(
          (c: { name: string; items: PublicFoodItem[] }) =>
            (c.items ?? []).map((item) => ({ ...item, category: c.name })),
        );
        const preorderable = flat.filter((item) => item.allowPreOrder);
        setMenuOptions(preorderable);
        setSelectedFood((current) => current || preorderable[0]?.name || "");
      })
      .catch(() => undefined);
  }, []);

  const rooms: HomeRoom[] = useMemo(() => {
    const sorted = [...apiRooms].sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
    return sorted.map((room) => {
      const localized = pickTranslated(
        locale,
        {
          name: room.name,
          description: room.description,
          shortDescription: room.shortDescription,
        },
        room.translationsJson,
      );
      const metaFromFields = [
        room.bedType?.trim() || null,
        room.maxGuests ? `${room.maxGuests} guests` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const short = (localized.shortDescription || "").trim();
      const long = (localized.description || "").trim();
      // Prefer a shortDescription that already lists bed/amenities as the meta line
      // so we never append bedType/guests on top of it.
      const detail =
        (short.includes("·") ? short : metaFromFields || short) || localized.name;
      const summary =
        long && long !== detail && long !== short
          ? long
          : short.includes("·")
            ? ""
            : short && short !== detail
              ? short
              : "";
      return {
        id: room.slug,
        name: localized.name,
        image: room.featuredImage || settings.hero_image || "/images/deluxe-room.jpg",
        images: room.images?.length
          ? room.images
          : [room.featuredImage || "/images/deluxe-room.jpg"],
        price: room.promotionalPrice ?? room.pricePerNight,
        capacity: room.maxGuests,
        detail,
        summary,
      };
    });
  }, [apiRooms, locale, settings.hero_image]);

  const conferenceSpaces: HomeVenue[] = useMemo(
    () =>
      apiPackages.map((pkg) => {
        const localized = pickTranslated(
          locale,
          {
            name: pkg.name,
            description: pkg.description,
            shortDescription: null,
          },
          pkg.translationsJson,
        );
        return {
          id: pkg.slug,
          packageId: pkg.id,
          name: localized.name,
          image: pkg.imageUrl || "/images/conference.jpg",
          detail: localized.description || "",
          capacity: `Up to ${pkg.capacity} delegates`,
          maxGuests: pkg.capacity,
          features: parseFeatures(pkg.featuresJson),
        };
      }),
    [apiPackages, locale],
  );

  const addressLines = settings.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const addressLine1 = addressLines[0] || settings.address;
  const addressLine2 = addressLines.slice(1).join(", ");

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    function shouldStayAtTop() {
      const hash = window.location.hash;
      return !hash || hash === "#events" || hash === "#home";
    }

    function pinToTop() {
      if (!shouldStayAtTop()) return;
      if (window.location.hash === "#events" || window.location.hash === "#home") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    const hash = window.location.hash;
    if (hash === "#booking-search" && isMobileBookingViewport()) {
      window.setTimeout(() => setBookingModalOpen(true), 80);
      return;
    }

    if (shouldStayAtTop()) {
      pinToTop();
      // Async home sections (upcoming events) can shift layout after first paint.
      const t1 = window.setTimeout(pinToTop, 80);
      const t2 = window.setTimeout(pinToTop, 350);
      const onPageShow = () => pinToTop();
      window.addEventListener("pageshow", onPageShow);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.removeEventListener("pageshow", onPageShow);
      };
    }

    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  }, []);

  useEffect(() => {
    function onOpenBooking() {
      if (isMobileBookingViewport()) {
        setBookingModalOpen(true);
        setSearchError("");
        return;
      }
      document
        .getElementById("booking-search")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.addEventListener(OPEN_BOOKING_SEARCH_EVENT, onOpenBooking);
    return () =>
      window.removeEventListener(OPEN_BOOKING_SEARCH_EVENT, onOpenBooking);
  }, []);

  const today = localIsoDate(new Date());

  const focusBookingStrip = (message?: string) => {
    if (message) setSearchError(message);
    if (isMobileBookingViewport()) {
      setBookingModalOpen(true);
      return;
    }
    const strip = document.getElementById("booking-search");
    strip?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => checkInRef.current?.focus(), 350);
  };

  const searchRooms = () => {
    if (!checkIn || !checkOut) {
      focusBookingStrip(t("validation.selectBothDates"));
      return;
    }
    if (checkOut <= checkIn) {
      focusBookingStrip(t("validation.checkoutAfterCheckin"));
      return;
    }
    if (Number(adults) < 1) {
      focusBookingStrip(t("validation.atLeastOneAdult"));
      return;
    }
    setSearchError("");
    setBookingModalOpen(false);
    const qs = new URLSearchParams({
      checkIn,
      checkOut,
      adults,
      children,
      rooms: roomsCount,
    });
    router.push(`/rooms/search?${qs.toString()}`);
  };

  const openBooking = () => {
    if (isMobileBookingViewport()) {
      setSearchError("");
      setBookingModalOpen(true);
      return;
    }
    // Prefer live search when dates are ready; otherwise take the guest to the strip.
    if (checkIn && checkOut && checkOut > checkIn) {
      searchRooms();
      return;
    }
    focusBookingStrip(t("validation.selectDatesBelow"));
  };

  const openConferenceRequest = (space?: HomeVenue) => {
    const qs = space ? `?package=${encodeURIComponent(space.id)}` : "";
    router.push(`/conference${qs}`);
  };

  const openFoodOrder = (item?: PublicFoodItem) => {
    if (item) setSelectedFood(item.name);
    else if (menuOptions[0]) setSelectedFood(menuOptions[0].name);
    setFoodPreview(null);
    setFoodOrderSubmitted(false);
    setFoodSubmitError("");
    setFoodOrderReference("");
    setFoodOrderOpen(true);
  };

  const submitFoodOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFoodSubmitError("");
    const selected = menuOptions.find((item) => item.name === selectedFood);
    if (!selected) {
      setFoodSubmitError(t("validation.unableCreateBooking"));
      return;
    }
    setFoodSubmitting(true);
    try {
      const res = await fetch("/api/food-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: foodGuestName,
          guestPhone: foodGuestPhone,
          guestEmail: foodGuestEmail || undefined,
          serviceDate: foodOrderDate,
          serviceTime: foodOrderTime,
          serviceType: foodService,
          specialInstructions: foodDietaryNotes || undefined,
          bookingReference: foodBookingRef || undefined,
          items: [
            {
              menuItemId: selected.id,
              quantity: Number(foodQuantity) || 1,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit food order.");
      }
      setFoodOrderReference(data.foodOrder?.reference ?? "");
      setFoodOrderSubmitted(true);
    } catch (err) {
      setFoodSubmitError(
        err instanceof Error ? err.message : "Unable to submit food order.",
      );
    } finally {
      setFoodSubmitting(false);
    }
  };

  const foodServiceLabel = t(FOOD_SERVICE_I18N[foodService]);

  return (
    <main>
      <div className="hero-block">
        <section className="hero" id="home">
          <img src={settings.hero_image || "/images/hero-venue.jpg"} alt="Aerial view of Highbury Lounge gardens and event venue" />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="eyebrow light">{t("home.eyebrow")}</p>
            <h1>{t("home.heroTitle")}</h1>
            <p className="hero-text">{t("home.heroText")}</p>
            <div className="hero-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => openBooking()}
              >
                {t("home.checkAvailability")}
              </button>
              <a className="button ghost" href="#about">
                {t("home.exploreVenue")} <span>↗</span>
              </a>
            </div>
          </div>
        </section>
        <div className="booking-strip" id="booking-search">
          <label>
            <span>{t("booking.checkIn")}</span>
            <input
              ref={checkInRef}
              type="date"
              aria-label={t("home.checkInDateAria")}
              min={today}
              value={checkIn}
              onChange={(event) => {
                setCheckIn(event.target.value);
                setSearchError("");
              }}
            />
          </label>
          <label>
            <span>{t("booking.checkOut")}</span>
            <input
              type="date"
              aria-label={t("home.checkOutDateAria")}
              min={checkIn || today}
              value={checkOut}
              onChange={(event) => {
                setCheckOut(event.target.value);
                setSearchError("");
              }}
            />
          </label>
          <label>
            <span>{t("booking.adults")}</span>
            <select
              aria-label={t("home.adultsAria")}
              value={adults}
              onChange={(event) => setAdults(event.target.value)}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {t("booking.adults")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("booking.children")}</span>
            <select
              aria-label={t("home.childrenAria")}
              value={children}
              onChange={(event) => setChildren(event.target.value)}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {t("booking.children")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("booking.rooms")}</span>
            <select
              aria-label={t("home.roomsAria")}
              value={roomsCount}
              onChange={(event) => setRoomsCount(event.target.value)}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? t("booking.room") : t("booking.rooms")}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={searchRooms}>
            {t("booking.searchRooms")}
          </button>
          {searchError ? (
            <p className="search-error" role="alert">
              {searchError}
            </p>
          ) : null}
        </div>
      </div>

      <BookingSearchModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        today={today}
        checkIn={checkIn}
        checkOut={checkOut}
        adults={adults}
        children={children}
        roomsCount={roomsCount}
        error={searchError}
        onCheckInChange={(value) => {
          setCheckIn(value);
          setSearchError("");
        }}
        onCheckOutChange={(value) => {
          setCheckOut(value);
          setSearchError("");
        }}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onRoomsChange={setRoomsCount}
        onSearch={searchRooms}
      />

      <HomeUpcomingEvents />

      <section className="section rooms-section" id="stay">
        <div className="section-head rooms-section-head">
          <div className="rooms-section-copy">
            <p className="eyebrow">{t("home.stayEyebrow")}</p>
            <h2 className="home-section-title rooms-section-title">{t("home.stayTitle")}</h2>
            <p className="section-sub">{t("home.stayNote")}</p>
          </div>
        </div>
        <div className="room-grid">
          {rooms.map((room) => (
            <article className="room-card" key={room.id}>
              <Link href={`/rooms/${room.id}`} className="room-card-media">
                <img src={room.image} alt={room.name} />
              </Link>
              <div className="room-card-content">
                <div>
                  <h3>
                    <Link href={`/rooms/${room.id}`}>{room.name}</Link>
                  </h3>
                  <p>{room.detail}</p>
                </div>
                <div className="room-price">
                  <span>{t("booking.from")}</span>
                  <strong>{formatMoney(room.price, "USD", i18n.language)}</strong>
                  <small>{t("home.nightRate")}</small>
                </div>
              </div>
              <Link className="room-card-cta" href={`/rooms/${room.id}`}>
                {t("rooms.previewRoom")} <span>→</span>
              </Link>
            </article>
            ))}
        </div>
      </section>

      <section className="experience" id="about">
        <div className="experience-image">
          <img src={settings.meet_image || "/images/conference.jpg"} alt="Highbury Lounge conference room prepared for a meeting" />
          <div className="capacity-badge">
            <strong>{t("home.flexibleBadge")}</strong>
            <span>{t("home.meetingSetups")}</span>
          </div>
        </div>
        <div className="experience-copy">
          <p className="eyebrow">{t("home.meetEyebrow")}</p>
          <h2 className="home-section-title">{t("home.meetTitle")}</h2>
          <p>{t("home.meetText")}</p>
          <ul>
            <li><span>01</span> {t("home.meetItem1")}</li>
            <li><span>02</span> {t("home.meetItem2")}</li>
            <li><span>03</span> {t("home.meetItem3")}</li>
          </ul>
          <button className="text-link text-link-button" onClick={() => openConferenceRequest()}>
            {t("home.requestQuote")} →
          </button>
        </div>
      </section>

      <section className="section conference-section" id="conferences">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("home.conferenceEyebrow")}</p>
            <h2 className="home-section-title conference-section-title">{t("home.conferenceTitle")}</h2>
          </div>
          <p className="price-note">{t("home.conferenceNote")}</p>
        </div>
        <div className="conference-grid">
          {conferenceSpaces.map((space) => (
            <article className="conference-card" key={space.id}>
              <img src={space.image} alt={space.name} />
              <div>
                <span>{space.capacity}</span>
                <h3>{space.name}</h3>
                <p>{space.detail}</p>
                <button className="conference-preview-button" onClick={() => setConferencePreview(space)}>
                  {t("previewVenue")} <b>→</b>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="celebrate">
        <img src={settings.celebrate_image || "/images/events.jpg"} alt="A beautifully set event at Highbury Lounge" />
        <div className="celebrate-shade" />
        <div>
          <p className="eyebrow light">{t("home.celebrateEyebrow")}</p>
          <h2 className="home-section-title">{t("home.celebrateTitle")}</h2>
          <p>{t("home.celebrateText")}</p>
          <div className="celebrate-actions">
            <Link className="button cream" href="/events">
              Explore Events
            </Link>
            <Link className="button ghost light" href="/conference">
              Host Your Event
            </Link>
          </div>
        </div>
      </section>

      <section className="section dining-section" id="dine">
        <div className="dining-copy">
          <p className="eyebrow">{t("home.dineEyebrow")}</p>
          <h2 className="home-section-title">{t("home.dineTitle")}</h2>
          <p>{t("home.dineText")}</p>
          <button className="text-link text-link-button" onClick={() => openFoodOrder()}>
            {t("home.preOrderMeal")} →
          </button>
        </div>
        <div className="dining-images">
          <img src={settings.dine_image_1 || "/images/dining.jpg"} alt="A Highbury Lounge plated meal" />
          <img src={settings.dine_image_2 || "/images/food.jpg"} alt="Freshly prepared food at Highbury Lounge" />
        </div>
      </section>

      <div id="dine-menu">
        <PublicMenuSection
          onPreview={(item) => {
            setFoodPreview(item);
            setMenuOptions((prev) =>
              prev.some((p) => p.id === item.id) ? prev : [...prev, item],
            );
          }}
          onOrder={(item) => {
            if (item) {
              setMenuOptions((prev) =>
                prev.some((p) => p.id === item.id) ? prev : [...prev, item],
              );
              openFoodOrder(item);
            } else {
              openFoodOrder();
            }
          }}
        />
      </div>

      <section className="section gallery-section" id="gallery">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("home.galleryEyebrow")}</p>
            <h2 className="home-section-title">{t("home.galleryTitle")}</h2>
          </div>
        </div>
        {gallery.length > 0 ? (
          <div className="gallery-grid">
            {gallery.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                className={index % 3 === 0 ? "gallery-wide" : undefined}
                src={image.imageUrl}
                alt={image.altText || "Highbury Lounge"}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="contact-section" id="contact">
        <div>
          <p className="eyebrow light">{t("home.contactEyebrow")}</p>
          <h2 className="home-section-title">{t("home.contactTitle")}</h2>
          <p>{t("home.contactText")}</p>
          <div className="contact-actions">
            <button className="button cream" onClick={() => openBooking()}>{t("home.bookNow")}</button>
            <a className="button ghost" href={whatsappHref(settings.whatsapp)} target="_blank" rel="noreferrer">{t("actions.whatsapp")}</a>
          </div>
        </div>
        <address>
          <span>{t("contact.visit")}</span>
          <strong>
            {addressLine1}
            {addressLine2 ? (
              <>
                <br />
                {addressLine2}
              </>
            ) : null}
          </strong>
          <span>{t("contact.call")}</span>
          <a href={telHref(settings.phone)}>{settings.phone}</a>
          <span>{t("contact.email")}</span>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </address>
      </section>

      <a className="whatsapp-float" href={whatsappHref(settings.whatsapp)} target="_blank" rel="noreferrer" aria-label={t("home.whatsappAria")}>
        <span>{t("whatsapp.chat")}</span> ↗
      </a>

      {conferencePreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConferencePreview(null)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="conference-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setConferencePreview(null)} aria-label={t("conference.closeVenuePreview")}>×</button>
            <img className="preview-hero" src={conferencePreview.image} alt={conferencePreview.name} />
            <div className="preview-content">
              <div>
                <p className="eyebrow">{t("conference.venueEyebrow")}</p>
                <h2 id="conference-preview-title">{conferencePreview.name}</h2>
                <p>{conferencePreview.detail}</p>
                <div className="preview-features">
                  {(conferencePreview.features.length
                    ? conferencePreview.features
                    : [
                        t("home.meetItem1"),
                        t("home.meetItem2"),
                        t("home.meetItem3"),
                      ]
                  ).map((feature) => (
                    <span key={feature}>✓ {feature}</span>
                  ))}
                </div>
              </div>
              <aside>
                <small>{t("conference.capacity")}</small>
                <strong>{conferencePreview.maxGuests}</strong>
                <span>{t("conference.maximumGuests")}</span>
                <button className="button primary" onClick={() => openConferenceRequest(conferencePreview)}>{t("conference.requestThisVenue")}</button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {foodPreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFoodPreview(null)}>
          <section className="preview-modal food-preview-modal" role="dialog" aria-modal="true" aria-labelledby="food-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setFoodPreview(null)} aria-label={t("menu.closeFoodPreview")}>×</button>
            <PreviewMediaGallery
              images={[
                ...(foodPreview.images ?? []).map((img) => img.imageUrl),
                foodPreview.imageUrl,
              ]}
              alt={foodPreview.name}
              fallback="/images/food.jpg"
            />
            <div className="preview-content">
              <div>
                <p className="eyebrow">{t("menu.kitchenEyebrow")}</p>
                <h2 id="food-preview-title">{foodPreview.name}</h2>
                <p>{foodPreview.shortDescription || foodPreview.description}</p>
                <div className="preview-features">
                  <span>✓ {t("menu.freshlyPrepared")}</span>
                  <span>✓ {t("menu.preOrderAvailable")}</span>
                  <span>✓ {t("menu.dineInOrCollect")}</span>
                  <span>✓ {t("menu.groupOrdersWelcome")}</span>
                </div>
              </div>
              <aside>
                <small>{t("menu.price")}</small>
                <strong>{formatMoney(foodPreview.promotionalPrice ?? foodPreview.price, foodPreview.currency || "USD", i18n.language)}</strong>
                <span>{t("menu.perServing")}</span>
                <button className="button primary" onClick={() => openFoodOrder(foodPreview)}>{t("menu.preOrderDish")}</button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {foodOrderOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFoodOrderOpen(false)}>
          <section className="conference-form-modal food-order-modal" role="dialog" aria-modal="true" aria-labelledby="food-order-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFoodOrderOpen(false)} aria-label={t("menu.closeFoodOrder")}>×</button>
            {!foodOrderSubmitted ? (
              <>
                <div className="form-heading">
                  <p className="eyebrow">{t("menu.orderAhead")}</p>
                  <h2 id="food-order-title">{t("menu.planningTitle")}</h2>
                  <p>{t("menu.planningBody")}</p>
                </div>
                <form onSubmit={submitFoodOrder}>
                  <fieldset>
                    <legend>{t("menu.yourMeal")}</legend>
                    <div className="form-row">
                      <label>{t("menu.menuItem")}
                        <select value={selectedFood} onChange={(event) => setSelectedFood(event.target.value)}>
                          {menuOptions.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} — {formatMoney(item.promotionalPrice ?? item.price, item.currency || "USD", i18n.language)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>{t("menu.quantity")}
                        <input type="number" min="1" max="100" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} required />
                      </label>
                    </div>
                    <div className="form-row three">
                      <label>{t("menu.requiredDate")}<input type="date" min={today} value={foodOrderDate} onChange={(event) => setFoodOrderDate(event.target.value)} required /></label>
                      <label>{t("menu.preferredTime")}<input type="time" value={foodOrderTime} onChange={(event) => setFoodOrderTime(event.target.value)} required /></label>
                      <label>{t("menu.service")}
                        <select value={foodService} onChange={(event) => setFoodService(event.target.value as FoodServiceKey)}>
                          {FOOD_SERVICE_KEYS.map((key) => (
                            <option key={key} value={key}>{t(FOOD_SERVICE_I18N[key])}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>{t("menu.yourDetails")}</legend>
                    <div className="form-row">
                      <label>
                        {t("menu.fullName")}
                        <input
                          type="text"
                          placeholder={t("menu.placeholderFullName")}
                          value={foodGuestName}
                          onChange={(e) => setFoodGuestName(e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        {t("menu.phoneWhatsApp")}
                        <input
                          type="tel"
                          placeholder={t("menu.placeholderPhone")}
                          value={foodGuestPhone}
                          onChange={(e) => setFoodGuestPhone(e.target.value)}
                          required
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        {t("menu.emailAddress")}
                        <input
                          type="email"
                          placeholder={t("menu.placeholderEmail")}
                          value={foodGuestEmail}
                          onChange={(e) => setFoodGuestEmail(e.target.value)}
                        />
                      </label>
                      <label>
                        {t("menu.roomOrBookingRef")}
                        <input
                          type="text"
                          placeholder={t("menu.placeholderOptional")}
                          value={foodBookingRef}
                          onChange={(e) => setFoodBookingRef(e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      {t("menu.dietaryNotes")}
                      <textarea
                        rows={4}
                        placeholder={t("menu.placeholderDietary")}
                        value={foodDietaryNotes}
                        onChange={(e) => setFoodDietaryNotes(e.target.value)}
                      />
                    </label>
                  </fieldset>
                  {foodSubmitError ? (
                    <p className="form-error" role="alert">
                      {foodSubmitError}
                    </p>
                  ) : null}
                  <div className="form-footer">
                    <p>{t("menu.foodOrderFooter")}</p>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={foodSubmitting || !menuOptions.length}
                    >
                      {foodSubmitting
                        ? t("booking.submitting")
                        : t("menu.submitPreOrder")}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="success conference-success">
                <span>✓</span>
                <h2>{t("menu.preOrderPrepared")}</h2>
                <p>{t("menu.preOrderSuccess", { quantity: foodQuantity, item: selectedFood })}</p>
                {foodOrderReference ? (
                  <p className="muted">Reference: {foodOrderReference}</p>
                ) : null}
                <a
                  className="button primary"
                  href={whatsappHref(
                    settings.whatsapp,
                    `Hello Highbury Lounge, I would like to pre-order ${foodQuantity} x ${selectedFood} for ${foodOrderDate} at ${foodOrderTime}. Service: ${foodServiceLabel}.${foodOrderReference ? ` Reference: ${foodOrderReference}.` : ""}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("menu.confirmWhatsApp")}
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

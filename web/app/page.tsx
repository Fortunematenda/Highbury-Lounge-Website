"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PublicMenuSection,
  type PublicMenuItem,
} from "@/app/components/PublicMenuSection";
import { PreviewMediaGallery } from "@/app/components/PreviewMediaGallery";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/I18nProvider";

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

const rooms = [
  {
    id: "deluxe-double",
    name: "Highbury Deluxe King",
    image: "/images/deluxe-room.jpg",
    images: [
      "/images/deluxe-room.jpg",
      "/images/family-room.jpg",
      "/images/pool.jpg",
      "/images/garden.jpg",
      "/images/dining.jpg",
    ],
    price: 85,
    capacity: 2,
    detail: "King bed · 2 guests · Breakfast included",
  },
  {
    id: "executive-twin",
    name: "Garden Executive Twin",
    image: "/images/family-room.jpg",
    images: [
      "/images/family-room.jpg",
      "/images/garden.jpg",
      "/images/pool.jpg",
      "/images/deluxe-room.jpg",
      "/images/events.jpg",
      "/images/dining.jpg",
    ],
    price: 110,
    capacity: 4,
    detail: "2 double beds · 4 guests · Garden view",
  },
  {
    id: "classic-queen",
    name: "Classic Queen Retreat",
    image: "/images/deluxe-room.jpg",
    images: [
      "/images/deluxe-room.jpg",
      "/images/garden.jpg",
      "/images/dining.jpg",
      "/images/pool.jpg",
      "/images/family-room.jpg",
    ],
    price: 72,
    capacity: 2,
    detail: "Queen bed · 2 guests · Quiet garden wing",
  },
  {
    id: "signature-suite",
    name: "Highbury Signature Suite",
    image: "/images/family-room.jpg",
    images: [
      "/images/family-room.jpg",
      "/images/deluxe-room.jpg",
      "/images/dining.jpg",
      "/images/events.jpg",
      "/images/garden.jpg",
      "/images/pool.jpg",
    ],
    price: 135,
    capacity: 2,
    detail: "King bed · Lounge area · Premium breakfast",
  },
  {
    id: "family-garden",
    name: "Garden Family Residence",
    image: "/images/family-room.jpg",
    images: [
      "/images/family-room.jpg",
      "/images/garden.jpg",
      "/images/pool.jpg",
      "/images/events.jpg",
      "/images/deluxe-room.jpg",
    ],
    price: 125,
    capacity: 4,
    detail: "2 double beds · 4 guests · Garden access",
  },
  {
    id: "business-studio",
    name: "Executive Business Studio",
    image: "/images/deluxe-room.jpg",
    images: [
      "/images/deluxe-room.jpg",
      "/images/conference.jpg",
      "/images/dining.jpg",
      "/images/family-room.jpg",
      "/images/garden.jpg",
    ],
    price: 95,
    capacity: 2,
    detail: "King bed · Work desk · High-speed Wi-Fi",
  },
];

const conferenceSpaces = [
  {
    id: "highbury-boardroom",
    name: "The Highbury Boardroom",
    image: "/images/conference.jpg",
    detail: "A polished private setting for leadership meetings, interviews and focused strategy sessions.",
    capacity: "Up to 16 delegates",
    maxGuests: 16,
    features: ["Boardroom seating", "Presentation screen", "High-speed Wi-Fi", "Tea and coffee service"],
  },
  {
    id: "greenfield-hall",
    name: "Greenfield Conference Hall",
    image: "/images/events.jpg",
    detail: "A flexible professional venue for workshops, presentations and company gatherings.",
    capacity: "Up to 80 delegates",
    maxGuests: 80,
    features: ["Flexible seating layouts", "Projector and screen", "PA system", "Catering available"],
  },
  {
    id: "garden-pavilion",
    name: "The Garden Pavilion",
    image: "/images/garden.jpg",
    detail: "An airy indoor-outdoor setting for launches, networking sessions and relaxed corporate events.",
    capacity: "Up to 120 guests",
    maxGuests: 120,
    features: ["Indoor-outdoor layout", "Natural garden setting", "PA system", "Custom catering"],
  },
  {
    id: "strategy-suite",
    name: "Executive Strategy Suite",
    image: "/images/dining.jpg",
    detail: "A comfortable premium space for planning days, private sessions and catered team meetings.",
    capacity: "Up to 30 delegates",
    maxGuests: 30,
    features: ["Private meeting room", "Presentation screen", "Breakout space", "Executive catering"],
  },
];

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
  const stayDefaults = defaultStayDates();
  const [roomPreview, setRoomPreview] = useState<(typeof rooms)[number] | null>(null);
  const [conferencePreview, setConferencePreview] = useState<(typeof conferenceSpaces)[number] | null>(null);
  const [foodPreview, setFoodPreview] = useState<PublicFoodItem | null>(null);
  const [foodOrderOpen, setFoodOrderOpen] = useState(false);
  const [foodOrderSubmitted, setFoodOrderSubmitted] = useState(false);
  const [selectedFood, setSelectedFood] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("1");
  const [foodOrderDate, setFoodOrderDate] = useState("");
  const [foodOrderTime, setFoodOrderTime] = useState("");
  const [foodService, setFoodService] = useState<FoodServiceKey>("dineIn");
  const [checkIn, setCheckIn] = useState(stayDefaults.checkIn);
  const [checkOut, setCheckOut] = useState(stayDefaults.checkOut);
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [roomsCount, setRoomsCount] = useState("1");
  const [searchError, setSearchError] = useState("");
  const [menuOptions, setMenuOptions] = useState<PublicFoodItem[]>([]);
  const checkInRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        const flat: PublicFoodItem[] = (data.categories ?? []).flatMap(
          (c: { name: string; items: PublicFoodItem[] }) =>
            (c.items ?? []).map((item) => ({ ...item, category: c.name })),
        );
        setMenuOptions(flat);
        setSelectedFood((current) => current || flat[0]?.name || "");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  }, []);

  const today = localIsoDate(new Date());

  const focusBookingStrip = (message?: string) => {
    if (message) setSearchError(message);
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
    // Prefer live search when dates are ready; otherwise take the guest to the strip.
    if (checkIn && checkOut && checkOut > checkIn) {
      searchRooms();
      return;
    }
    focusBookingStrip(t("validation.selectDatesBelow"));
  };

  const openConferenceRequest = (space?: (typeof conferenceSpaces)[number]) => {
    const qs = space ? `?package=${space.id}` : "";
    router.push(`/conference${qs}`);
  };

  const openFoodOrder = (item?: PublicFoodItem) => {
    if (item) setSelectedFood(item.name);
    else if (menuOptions[0]) setSelectedFood(menuOptions[0].name);
    setFoodPreview(null);
    setFoodOrderSubmitted(false);
    setFoodOrderOpen(true);
  };

  const submitFoodOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFoodOrderSubmitted(true);
  };

  const foodServiceLabel = t(FOOD_SERVICE_I18N[foodService]);

  return (
    <main>
      <section className="hero" id="home">
        <img src="/images/hero-venue.jpg" alt="Aerial view of Highbury Lounge gardens and event venue" />
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
            <a className="button ghost" href="#meet">
              {t("home.exploreVenue")} <span>↗</span>
            </a>
          </div>
        </div>
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
      </section>

      <section className="intro section">
        <div>
          <p className="eyebrow">{t("home.introEyebrow")}</p>
          <h2>{t("home.introTitle")}</h2>
        </div>
        <div className="intro-copy">
          <p>{t("home.introText")}</p>
          <div className="feature-row">
            <span>✓ {t("home.featureParking")}</span>
            <span>✓ {t("home.featureBreakfast")}</span>
            <span>✓ {t("home.featureGardens")}</span>
          </div>
        </div>
      </section>

      <section className="section rooms-section" id="stay">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("home.stayEyebrow")}</p>
            <h2>{t("home.stayTitle")}</h2>
          </div>
          <p className="price-note">{t("home.stayNote")}</p>
        </div>
        <div className="room-grid">
          {rooms.map((room) => (
            <article className="room-card" key={room.name}>
              <img src={room.image} alt={room.name} />
              <div className="room-card-content">
                <div>
                  <h3>{room.name}</h3>
                  <p>{room.detail}</p>
                </div>
                <div className="room-price">
                  <span>{t("booking.from")}</span>
                  <strong>{formatMoney(room.price, "USD", i18n.language)}</strong>
                  <small>{t("home.nightRate")}</small>
                </div>
              </div>
              <button onClick={() => setRoomPreview(room)}>
                {t("rooms.previewRoom")} <span>→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="experience" id="meet">
        <div className="experience-image">
          <img src="/images/conference.jpg" alt="Highbury Lounge conference room prepared for a meeting" />
          <div className="capacity-badge">
            <strong>{t("home.flexibleBadge")}</strong>
            <span>{t("home.meetingSetups")}</span>
          </div>
        </div>
        <div className="experience-copy">
          <p className="eyebrow">{t("home.meetEyebrow")}</p>
          <h2>{t("home.meetTitle")}</h2>
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

      <section className="section conference-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("home.conferenceEyebrow")}</p>
            <h2>{t("home.conferenceTitle")}</h2>
          </div>
          <p className="price-note">{t("home.conferenceNote")}</p>
        </div>
        <div className="conference-grid">
          {conferenceSpaces.map((space) => (
            <article className="conference-card" key={space.name}>
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
        <img src="/images/events.jpg" alt="A beautifully set event at Highbury Lounge" />
        <div className="celebrate-shade" />
        <div>
          <p className="eyebrow light">{t("home.celebrateEyebrow")}</p>
          <h2>{t("home.celebrateTitle")}</h2>
          <p>{t("home.celebrateText")}</p>
          <a className="button cream" href="https://wa.me/263786957068?text=Hello%20Highbury%20Lounge%2C%20I%20would%20like%20an%20event%20quote." target="_blank" rel="noreferrer">
            {t("home.planEvent")}
          </a>
        </div>
      </section>

      <section className="section dining-section" id="dine">
        <div className="dining-copy">
          <p className="eyebrow">{t("home.dineEyebrow")}</p>
          <h2>{t("home.dineTitle")}</h2>
          <p>{t("home.dineText")}</p>
          <button className="text-link text-link-button" onClick={() => openFoodOrder()}>
            {t("home.preOrderMeal")} →
          </button>
        </div>
        <div className="dining-images">
          <img src="/images/dining.jpg" alt="A Highbury Lounge plated meal" />
          <img src="/images/food.jpg" alt="Freshly prepared food at Highbury Lounge" />
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
            <h2>{t("home.galleryTitle")}</h2>
          </div>
        </div>
        <div className="gallery-grid">
          <img className="gallery-wide" src="/images/garden.jpg" alt="Highbury Lounge garden" />
          <img src="/images/pool.jpg" alt="Highbury Lounge swimming pool" />
          <img src="/images/family-room.jpg" alt="Highbury Lounge guest room" />
          <img className="gallery-wide" src="/images/events.jpg" alt="Highbury Lounge event setting" />
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div>
          <p className="eyebrow light">{t("home.contactEyebrow")}</p>
          <h2>{t("home.contactTitle")}</h2>
          <p>{t("home.contactText")}</p>
          <div className="contact-actions">
            <button className="button cream" onClick={() => openBooking()}>{t("home.bookNow")}</button>
            <a className="button ghost" href="https://wa.me/263786957068" target="_blank" rel="noreferrer">{t("actions.whatsapp")}</a>
          </div>
        </div>
        <address>
          <span>{t("contact.visit")}</span>
          <strong>{t("contact.addressLine1")}<br />{t("contact.addressLine2")}</strong>
          <span>{t("contact.call")}</span>
          <a href="tel:+263786957068">{t("contact.phoneDisplay")}</a>
          <span>{t("contact.email")}</span>
          <a href="mailto:test@higbury.com">{t("contact.emailDisplay")}</a>
        </address>
      </section>

      <a className="whatsapp-float" href="https://wa.me/263786957068" target="_blank" rel="noreferrer" aria-label={t("home.whatsappAria")}>
        <span>{t("whatsapp.chat")}</span> ↗
      </a>

      {roomPreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRoomPreview(null)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="room-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setRoomPreview(null)} aria-label={t("home.closeRoomPreview")}>×</button>
            <PreviewMediaGallery
              images={roomPreview.images?.length ? roomPreview.images : [roomPreview.image]}
              alt={roomPreview.name}
              fallback="/images/deluxe-room.jpg"
            />
            <div className="preview-content">
              <div>
                <p className="eyebrow">{t("home.stayPreviewEyebrow")}</p>
                <h2 id="room-preview-title">{roomPreview.name}</h2>
                <p>{roomPreview.detail}</p>
                <div className="preview-features">
                  <span>✓ {t("home.featurePrivateRoom")}</span>
                  <span>✓ {t("home.featureParking")}</span>
                  <span>✓ {t("home.featureWifi")}</span>
                  <span>✓ {t("home.featureBreakfast")}</span>
                </div>
              </div>
              <aside>
                <small>{t("booking.from")}</small>
                <strong>{formatMoney(roomPreview.price, "USD", i18n.language)}</strong>
                <span>{t("booking.perNight")}</span>
                <button className="button primary" onClick={() => { setRoomPreview(null); openBooking(); }}>{t("booking.reserveNow")}</button>
              </aside>
            </div>
          </section>
        </div>
      )}

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
                  {conferencePreview.features.map((feature) => <span key={feature}>✓ {feature}</span>)}
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
                      <label>{t("menu.fullName")}<input type="text" placeholder={t("menu.placeholderFullName")} required /></label>
                      <label>{t("menu.phoneWhatsApp")}<input type="tel" placeholder={t("menu.placeholderPhone")} required /></label>
                    </div>
                    <div className="form-row">
                      <label>{t("menu.emailAddress")}<input type="email" placeholder={t("menu.placeholderEmail")} /></label>
                      <label>{t("menu.roomOrBookingRef")}<input type="text" placeholder={t("menu.placeholderOptional")} /></label>
                    </div>
                    <label>{t("menu.dietaryNotes")}<textarea rows={4} placeholder={t("menu.placeholderDietary")} /></label>
                  </fieldset>
                  <div className="form-footer">
                    <p>{t("menu.foodOrderFooter")}</p>
                    <button className="button primary" type="submit">{t("menu.submitPreOrder")}</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="success conference-success">
                <span>✓</span>
                <h2>{t("menu.preOrderPrepared")}</h2>
                <p>{t("menu.preOrderSuccess", { quantity: foodQuantity, item: selectedFood })}</p>
                <a
                  className="button primary"
                  href={`https://wa.me/263786957068?text=${encodeURIComponent(`Hello Highbury Lounge, I would like to pre-order ${foodQuantity} x ${selectedFood} for ${foodOrderDate} at ${foodOrderTime}. Service: ${foodServiceLabel}.`)}`}
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

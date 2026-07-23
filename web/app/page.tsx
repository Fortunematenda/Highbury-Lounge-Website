"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PublicMenuSection,
  type PublicMenuItem,
} from "@/app/components/PublicMenuSection";
import { PreviewMediaGallery } from "@/app/components/PreviewMediaGallery";
import { formatMoney } from "@/lib/format";

type PublicFoodItem = PublicMenuItem & { category?: string };

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
  const [foodService, setFoodService] = useState("Dine in");
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
      focusBookingStrip("Please select both your check-in and check-out dates.");
      return;
    }
    if (checkOut <= checkIn) {
      focusBookingStrip("Check-out must be after your check-in date.");
      return;
    }
    if (Number(adults) < 1) {
      focusBookingStrip("At least one adult is required.");
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
    focusBookingStrip("Select your dates below, then search available rooms.");
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

  return (
    <main>
      <section className="hero" id="home">
        <img src="/images/hero-venue.jpg" alt="Aerial view of Highbury Lounge gardens and event venue" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow light">A warm welcome to Kadoma</p>
          <h1>Where every stay becomes a story.</h1>
          <p className="hero-text">
            Comfortable rooms, beautiful gardens and memorable celebrations—all in one welcoming destination.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => openBooking()}
            >
              Check availability
            </button>
            <a className="button ghost" href="#meet">Explore the venue <span>↗</span></a>
          </div>
        </div>
        <div className="booking-strip" id="booking-search">
          <label>
            <span>Check in</span>
            <input
              ref={checkInRef}
              type="date"
              aria-label="Check in date"
              min={today}
              value={checkIn}
              onChange={(event) => {
                setCheckIn(event.target.value);
                setSearchError("");
              }}
            />
          </label>
          <label>
            <span>Check out</span>
            <input
              type="date"
              aria-label="Check out date"
              min={checkIn || today}
              value={checkOut}
              onChange={(event) => {
                setCheckOut(event.target.value);
                setSearchError("");
              }}
            />
          </label>
          <label>
            <span>Adults</span>
            <select aria-label="Number of adults" value={adults} onChange={(event) => setAdults(event.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} Adult{n === 1 ? "" : "s"}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Children</span>
            <select aria-label="Number of children" value={children} onChange={(event) => setChildren(event.target.value)}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} Child{n === 1 ? "" : "ren"}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Rooms</span>
            <select aria-label="Number of rooms" value={roomsCount} onChange={(event) => setRoomsCount(event.target.value)}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} Room{n === 1 ? "" : "s"}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={searchRooms}>
            Search rooms
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
          <p className="eyebrow">Rest · Gather · Celebrate</p>
          <h2>Hospitality with heart, moments made beautifully.</h2>
        </div>
        <div className="intro-copy">
          <p>
            Highbury Lounge brings together restful accommodation, flexible conference spaces,
            generous food and tranquil gardens in the heart of Kadoma.
          </p>
          <div className="feature-row">
            <span>✓ Secure parking</span>
            <span>✓ Breakfast available</span>
            <span>✓ Event-ready gardens</span>
          </div>
        </div>
      </section>

      <section className="section rooms-section" id="stay">
        <div className="section-head">
          <div>
            <p className="eyebrow">Stay at Highbury</p>
            <h2>Rooms designed for an easy stay.</h2>
          </div>
          <p className="price-note">Choose the room style that best suits your stay. Rates are shown per night.</p>
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
                  <span>From</span>
                  <strong>US${room.price}</strong>
                  <small>/ night*</small>
                </div>
              </div>
              <button onClick={() => setRoomPreview(room)}>Preview room <span>→</span></button>
            </article>
          ))}
        </div>
      </section>

      <section className="experience" id="meet">
        <div className="experience-image">
          <img src="/images/conference.jpg" alt="Highbury Lounge conference room prepared for a meeting" />
          <div className="capacity-badge"><strong>Flexible</strong><span>meeting setups</span></div>
        </div>
        <div className="experience-copy">
          <p className="eyebrow">Meet & connect</p>
          <h2>A smart setting for meetings that matter.</h2>
          <p>
            From focused team sessions to workshops and corporate functions, our adaptable venue
            gives every gathering the room, service and calm it needs.
          </p>
          <ul>
            <li><span>01</span> Conference and boardroom layouts</li>
            <li><span>02</span> Catering packages for every agenda</li>
            <li><span>03</span> Accommodation for travelling delegates</li>
          </ul>
          <button className="text-link text-link-button" onClick={() => openConferenceRequest()}>
            Request a conference quote →
          </button>
        </div>
      </section>

      <section className="section conference-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Conference spaces</p>
            <h2>A professional space for every agenda.</h2>
          </div>
          <p className="price-note">Choose a setup and speak to our team about dates, catering and equipment.</p>
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
                  Preview venue <b>→</b>
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
          <p className="eyebrow light">Celebrate at Highbury</p>
          <h2>Beautiful spaces for your biggest moments.</h2>
          <p>Weddings, birthdays, graduations and private events, made memorable in our garden venue.</p>
          <a className="button cream" href="https://wa.me/263786957068?text=Hello%20Highbury%20Lounge%2C%20I%20would%20like%20an%20event%20quote." target="_blank" rel="noreferrer">
            Plan your event
          </a>
        </div>
      </section>

      <section className="section dining-section" id="dine">
        <div className="dining-copy">
          <p className="eyebrow">Taste Highbury</p>
          <h2>Good food, generously served.</h2>
          <p>
            Start the day with breakfast, enjoy a satisfying lunch or gather over dinner.
            Our kitchen serves familiar favourites with a fresh local touch.
          </p>
          <button className="text-link text-link-button" onClick={() => openFoodOrder()}>
            Pre-order your meal →
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
            <p className="eyebrow">A glimpse of Highbury</p>
            <h2>Come for the stay. Remember the feeling.</h2>
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
          <p className="eyebrow light">Your Kadoma escape</p>
          <h2>Ready to make yourself at home?</h2>
          <p>Book a room, request a conference quote or start planning your next celebration.</p>
          <div className="contact-actions">
            <button className="button cream" onClick={() => openBooking()}>Book now</button>
            <a className="button ghost" href="https://wa.me/263786957068" target="_blank" rel="noreferrer">WhatsApp us</a>
          </div>
        </div>
        <address>
          <span>Visit</span>
          <strong>7504 Greenfield Cherries<br />Kadoma, Zimbabwe</strong>
          <span>Call or WhatsApp</span>
          <a href="tel:+263786957068">+263 78 695 7068</a>
          <span>Email</span>
          <a href="mailto:test@higbury.com">test@higbury.com</a>
        </address>
      </section>

      <a className="whatsapp-float" href="https://wa.me/263786957068" target="_blank" rel="noreferrer" aria-label="Chat with Highbury Lounge on WhatsApp">
        <span>Chat with us</span> ↗
      </a>

      {roomPreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setRoomPreview(null)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="room-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setRoomPreview(null)} aria-label="Close room preview">×</button>
            <PreviewMediaGallery
              images={roomPreview.images?.length ? roomPreview.images : [roomPreview.image]}
              alt={roomPreview.name}
              fallback="/images/deluxe-room.jpg"
            />
            <div className="preview-content">
              <div>
                <p className="eyebrow">Your Highbury stay</p>
                <h2 id="room-preview-title">{roomPreview.name}</h2>
                <p>{roomPreview.detail}</p>
                <div className="preview-features">
                  <span>✓ Private room</span><span>✓ Secure parking</span><span>✓ Wi-Fi access</span><span>✓ Breakfast available</span>
                </div>
              </div>
              <aside>
                <small>From</small>
                <strong>US${roomPreview.price}</strong>
                <span>per night</span>
                <button className="button primary" onClick={() => { setRoomPreview(null); openBooking(); }}>Reserve now</button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {conferencePreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConferencePreview(null)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="conference-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setConferencePreview(null)} aria-label="Close venue preview">×</button>
            <img className="preview-hero" src={conferencePreview.image} alt={conferencePreview.name} />
            <div className="preview-content">
              <div>
                <p className="eyebrow">Conference venue</p>
                <h2 id="conference-preview-title">{conferencePreview.name}</h2>
                <p>{conferencePreview.detail}</p>
                <div className="preview-features">
                  {conferencePreview.features.map((feature) => <span key={feature}>✓ {feature}</span>)}
                </div>
              </div>
              <aside>
                <small>Capacity</small>
                <strong>{conferencePreview.maxGuests}</strong>
                <span>maximum guests</span>
                <button className="button primary" onClick={() => openConferenceRequest(conferencePreview)}>Request this venue</button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {foodPreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFoodPreview(null)}>
          <section className="preview-modal food-preview-modal" role="dialog" aria-modal="true" aria-labelledby="food-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close modal-close-light" onClick={() => setFoodPreview(null)} aria-label="Close food preview">×</button>
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
                <p className="eyebrow">Kitchen</p>
                <h2 id="food-preview-title">{foodPreview.name}</h2>
                <p>{foodPreview.shortDescription || foodPreview.description}</p>
                <div className="preview-features">
                  <span>✓ Freshly prepared</span><span>✓ Pre-order available</span>
                  <span>✓ Dine in or collect</span><span>✓ Group orders welcome</span>
                </div>
              </div>
              <aside>
                <small>Price</small>
                <strong>{formatMoney(foodPreview.promotionalPrice ?? foodPreview.price, foodPreview.currency || "USD")}</strong>
                <span>per serving</span>
                <button className="button primary" onClick={() => openFoodOrder(foodPreview)}>Pre-order this dish</button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {foodOrderOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFoodOrderOpen(false)}>
          <section className="conference-form-modal food-order-modal" role="dialog" aria-modal="true" aria-labelledby="food-order-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFoodOrderOpen(false)} aria-label="Close food pre-order form">×</button>
            {!foodOrderSubmitted ? (
              <>
                <div className="form-heading">
                  <p className="eyebrow">Order ahead</p>
                  <h2 id="food-order-title">Food pre-order</h2>
                  <p>Choose your meal and preferred service time. Our kitchen team will confirm your order and final availability.</p>
                </div>
                <form onSubmit={submitFoodOrder}>
                  <fieldset>
                    <legend>Your meal</legend>
                    <div className="form-row">
                      <label>Menu item
                        <select value={selectedFood} onChange={(event) => setSelectedFood(event.target.value)}>
                          {menuOptions.map((item) => (
                            <option key={item.id} value={item.name}>{item.name} — {formatMoney(item.promotionalPrice ?? item.price, item.currency || "USD")}</option>
                          ))}
                        </select>
                      </label>
                      <label>Quantity
                        <input type="number" min="1" max="100" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} required />
                      </label>
                    </div>
                    <div className="form-row three">
                      <label>Required date<input type="date" min={today} value={foodOrderDate} onChange={(event) => setFoodOrderDate(event.target.value)} required /></label>
                      <label>Preferred time<input type="time" value={foodOrderTime} onChange={(event) => setFoodOrderTime(event.target.value)} required /></label>
                      <label>Service
                        <select value={foodService} onChange={(event) => setFoodService(event.target.value)}>
                          <option>Dine in</option><option>Collection</option><option>Room service</option><option>Conference catering</option>
                        </select>
                      </label>
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Your details</legend>
                    <div className="form-row">
                      <label>Full name<input type="text" placeholder="Your full name" required /></label>
                      <label>Phone / WhatsApp<input type="tel" placeholder="+263..." required /></label>
                    </div>
                    <div className="form-row">
                      <label>Email address<input type="email" placeholder="you@example.com" /></label>
                      <label>Room or booking reference<input type="text" placeholder="Optional" /></label>
                    </div>
                    <label>Dietary needs or order notes<textarea rows={4} placeholder="Tell us about allergies, dietary needs, sides or special instructions." /></label>
                  </fieldset>
                  <div className="form-footer">
                    <p>Your order is confirmed after the Highbury team checks kitchen availability and contacts you.</p>
                    <button className="button primary" type="submit">Send pre-order</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="success conference-success">
                <span>✓</span>
                <h2>Pre-order prepared</h2>
                <p>Your request for {foodQuantity} × {selectedFood} is ready to send to the Highbury kitchen team for confirmation.</p>
                <a
                  className="button primary"
                  href={`https://wa.me/263786957068?text=${encodeURIComponent(`Hello Highbury Lounge, I would like to pre-order ${foodQuantity} x ${selectedFood} for ${foodOrderDate} at ${foodOrderTime}. Service: ${foodService}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Confirm on WhatsApp
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

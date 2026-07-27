"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { formatDate, formatMoney } from "@/lib/format";
import { LanguageSelector } from "@/lib/i18n/LanguageSelector";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type RoomSummary = {
  id: number;
  name: string;
  effectivePrice: number;
  nights: number;
  estimatedTotal: number;
  shortDescription: string | null;
  featuredImage: string | null;
};

type MenuOption = {
  id: number;
  name: string;
  price: number;
  promotionalPrice: number | null;
  currency: string;
  allowPreOrder: boolean;
};

type FoodCartLine = {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
};

function BookInner() {
  const { t, i18n } = useTranslation();
  const params = useSearchParams();
  const router = useRouter();
  const roomTypeId = Number(params.get("roomTypeId"));
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? "1");
  const children = Number(params.get("children") ?? "0");
  const rooms = Number(params.get("rooms") ?? "1");

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [foodCart, setFoodCart] = useState<FoodCartLine[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [foodQty, setFoodQty] = useState("1");
  const [foodNotes, setFoodNotes] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    country: "Zimbabwe",
    specialRequests: "",
    estimatedArrival: "",
    termsAccepted: false,
  });

  useEffect(() => {
    async function load() {
      if (!roomTypeId || !checkIn || !checkOut) return;
      const qs = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
        rooms: String(rooms),
      });
      const res = await fetch(`/api/availability?${qs}`);
      const data = await res.json();
      const match = (data.results ?? []).find(
        (r: RoomSummary) => r.id === roomTypeId,
      );
      setRoom(match ?? null);
      if (!match) setError(t("validation.roomUnavailable"));
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeId, checkIn, checkOut, adults, children, rooms]);

  useEffect(() => {
    async function loadMenu() {
      const res = await fetch("/api/menu");
      const data = await res.json();
      const flat: MenuOption[] = [];
      for (const category of data.categories ?? []) {
        for (const item of category.items ?? []) {
          if (item.allowPreOrder) {
            flat.push({
              id: item.id,
              name: item.name,
              price: item.price,
              promotionalPrice: item.promotionalPrice,
              currency: item.currency || "USD",
              allowPreOrder: true,
            });
          }
        }
      }
      setMenuOptions(flat);
      if (flat[0]) setSelectedMenuId(String(flat[0].id));
    }
    void loadMenu();
  }, []);

  const guestLabel = useMemo(
    () =>
      `${adults} ${t("booking.adults")}${
        children > 0 ? `, ${children} ${t("booking.children")}` : ""
      }`,
    [adults, children, t],
  );

  const foodTotal = useMemo(
    () =>
      Math.round(
        foodCart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) *
          100,
      ) / 100,
    [foodCart],
  );

  const estimatedGrandTotal = useMemo(
    () =>
      Math.round(((room?.estimatedTotal ?? 0) + foodTotal) * 100) / 100,
    [room?.estimatedTotal, foodTotal],
  );

  function addFoodLine() {
    const menu = menuOptions.find((m) => m.id === Number(selectedMenuId));
    if (!menu) return;
    const quantity = Math.max(1, Math.floor(Number(foodQty) || 1));
    const unitPrice =
      menu.promotionalPrice != null && menu.promotionalPrice > 0
        ? menu.promotionalPrice
        : menu.price;
    setFoodCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === menu.id);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menu.id
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        );
      }
      return [
        ...prev,
        {
          menuItemId: menu.id,
          name: menu.name,
          quantity,
          unitPrice,
          currency: menu.currency,
        },
      ];
    });
  }

  function removeFoodLine(menuItemId: number) {
    setFoodCart((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  }

  function goSummary(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.termsAccepted) {
      setError(t("validation.acceptTerms"));
      return;
    }
    setStep("summary");
  }

  async function submitBooking() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          checkIn,
          checkOut,
          adults,
          children,
          roomsBooked: rooms,
          preferredLanguage: i18n.language,
          guest: form,
          foodSpecialInstructions: foodNotes || undefined,
          extras: foodCart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("validation.unableCreateBooking"));
      router.push(
        `/book/success?reference=${encodeURIComponent(data.booking.reference)}&total=${data.booking.totalAmount}&currency=${data.booking.currency}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("validation.unableCreateBooking"));
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink
          href={`/rooms/search?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&adults=${adults}&children=${children}&rooms=${rooms}`}
          label={t("booking.backToResults")}
        />
        <LanguageSelector variant="panel" />
        <p className="eyebrow">{t("booking.reserveStay")}</p>
        <h1>
          {step === "form" ? t("booking.guestDetails") : t("booking.confirmBooking")}
        </h1>

        {room && (
          <aside className="booking-summary-card">
            <img src={room.featuredImage || "/images/deluxe-room.jpg"} alt={room.name} />
            <div>
              <h2>{room.name}</h2>
              <p>{room.shortDescription}</p>
              <p>
                {formatDate(checkIn, i18n.language)} → {formatDate(checkOut, i18n.language)} ·{" "}
                {room.nights}{" "}
                {room.nights === 1 ? t("booking.night") : t("booking.nights")}
              </p>
              <p>
                {guestLabel} · {rooms} {t("booking.rooms")}
              </p>
              <p>
                {formatMoney(room.effectivePrice, "USD", i18n.language)} /{" "}
                {t("booking.perNight")} · {t("booking.total")}{" "}
                <strong>
                  {formatMoney(room.estimatedTotal, "USD", i18n.language)}
                </strong>
              </p>
            </div>
          </aside>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {step === "form" ? (
          <form className="guest-form" onSubmit={goSummary}>
            <div className="form-row">
              <label>
                {t("booking.firstName")}
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </label>
              <label>
                {t("booking.lastName")}
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                {t("booking.email")}
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                {t("booking.phone")}
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                {t("booking.whatsapp")} ({t("booking.optional")})
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </label>
              <label>
                {t("booking.country")}
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </label>
            </div>
            <label>
              {t("booking.estimatedArrival")} ({t("booking.optional")})
              <input
                type="time"
                value={form.estimatedArrival}
                onChange={(e) =>
                  setForm({ ...form, estimatedArrival: e.target.value })
                }
              />
            </label>
            <label>
              {t("booking.specialRequests")}
              <textarea
                rows={4}
                value={form.specialRequests}
                onChange={(e) =>
                  setForm({ ...form, specialRequests: e.target.value })
                }
              />
            </label>

            {menuOptions.length > 0 ? (
              <fieldset className="booking-food-fieldset">
                <legend>{t("menu.orderAhead")}</legend>
                <p className="muted">{t("menu.planningBody")}</p>
                <div className="form-row">
                  <label>
                    {t("menu.menuItem")}
                    <select
                      value={selectedMenuId}
                      onChange={(e) => setSelectedMenuId(e.target.value)}
                    >
                      {menuOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} —{" "}
                          {formatMoney(
                            item.promotionalPrice ?? item.price,
                            item.currency,
                            i18n.language,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("menu.quantity")}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={foodQty}
                      onChange={(e) => setFoodQty(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="button ghost"
                  onClick={addFoodLine}
                >
                  Add to order
                </button>
                {foodCart.length > 0 ? (
                  <ul className="booking-food-cart">
                    {foodCart.map((line) => (
                      <li key={line.menuItemId}>
                        <span>
                          {line.name} ×{line.quantity} —{" "}
                          {formatMoney(
                            line.unitPrice * line.quantity,
                            line.currency,
                            i18n.language,
                          )}
                        </span>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => removeFoodLine(line.menuItemId)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label>
                  {t("menu.dietaryNotes")}
                  <textarea
                    rows={3}
                    value={foodNotes}
                    onChange={(e) => setFoodNotes(e.target.value)}
                    placeholder={t("menu.placeholderDietary")}
                  />
                </label>
              </fieldset>
            ) : null}

            <label className="check-choice">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) =>
                  setForm({ ...form, termsAccepted: e.target.checked })
                }
              />
              {t("booking.termsLabel")}
            </label>
            <button className="button primary" type="submit" disabled={!room}>
              {t("booking.reviewBooking")}
            </button>
          </form>
        ) : (
          <div className="confirm-panel">
            <h2>{t("booking.bookingSummary")}</h2>
            <ul>
              <li>
                {t("booking.guest")}: {form.firstName} {form.lastName}
              </li>
              <li>
                {t("booking.email")}: {form.email}
              </li>
              <li>
                {t("booking.phone")}: {form.phone}
              </li>
              <li>
                {t("booking.room")}: {room?.name}
              </li>
              <li>
                {t("booking.stay")}: {formatDate(checkIn, i18n.language)}{" "}
                {t("booking.to")} {formatDate(checkOut, i18n.language)}
              </li>
              <li>
                {t("booking.guests")}: {guestLabel}
              </li>
              {foodCart.map((line) => (
                <li key={line.menuItemId}>
                  {line.name} ×{line.quantity}:{" "}
                  {formatMoney(
                    line.unitPrice * line.quantity,
                    line.currency,
                    i18n.language,
                  )}
                </li>
              ))}
              <li>
                {t("booking.totalDueLater")}:{" "}
                {formatMoney(estimatedGrandTotal, "USD", i18n.language)}
              </li>
            </ul>
            <p className="muted">{t("booking.pendingNote")}</p>
            <div className="hero-actions">
              <button className="button ghost" type="button" onClick={() => setStep("form")}>
                {t("booking.editDetails")}
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => void submitBooking()}
                disabled={submitting}
              >
                {submitting ? t("booking.submitting") : t("booking.confirmReservation")}
              </button>
            </div>
          </div>
        )}
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

export default function BookPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookInner />
    </Suspense>
  );
}

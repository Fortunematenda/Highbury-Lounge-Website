"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export const OPEN_BOOKING_SEARCH_EVENT = "hl:open-booking-search";

export function isMobileBookingViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px)").matches;
}

type Props = {
  open: boolean;
  onClose: () => void;
  today: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  roomsCount: string;
  error: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onAdultsChange: (value: string) => void;
  onChildrenChange: (value: string) => void;
  onRoomsChange: (value: string) => void;
  onSearch: () => void;
};

export function BookingSearchModal({
  open,
  onClose,
  today,
  checkIn,
  checkOut,
  adults,
  children,
  roomsCount,
  error,
  onCheckInChange,
  onCheckOutChange,
  onAdultsChange,
  onChildrenChange,
  onRoomsChange,
  onSearch,
}: Props) {
  const { t } = useTranslation();
  const checkInRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => checkInRef.current?.focus(), 40);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch();
  }

  return createPortal(
    <div
      className="booking-search-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="booking-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-search-modal-title"
      >
        <header className="booking-search-modal-header">
          <div>
            <p className="eyebrow">{t("nav.bookStay")}</p>
            <h2 id="booking-search-modal-title">{t("home.checkAvailability")}</h2>
          </div>
          <button
            type="button"
            className="booking-search-modal-close"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <form className="booking-search-modal-form" onSubmit={submit} noValidate>
          <label className="booking-search-modal-field">
            <span>{t("booking.checkIn")}</span>
            <div className="booking-search-modal-value">
              <input
                ref={checkInRef}
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => onCheckInChange(e.target.value)}
                aria-label={t("home.checkInDateAria")}
                required
              />
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          <label className="booking-search-modal-field">
            <span>{t("booking.checkOut")}</span>
            <div className="booking-search-modal-value">
              <input
                type="date"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => onCheckOutChange(e.target.value)}
                aria-label={t("home.checkOutDateAria")}
                required
              />
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          <label className="booking-search-modal-field">
            <span>{t("booking.adults")}</span>
            <div className="booking-search-modal-value">
              <select
                value={adults}
                onChange={(e) => onAdultsChange(e.target.value)}
                aria-label={t("home.adultsAria")}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("booking.adults")}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          <label className="booking-search-modal-field">
            <span>{t("booking.children")}</span>
            <div className="booking-search-modal-value">
              <select
                value={children}
                onChange={(e) => onChildrenChange(e.target.value)}
                aria-label={t("home.childrenAria")}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("booking.children")}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          <label className="booking-search-modal-field">
            <span>{t("booking.rooms")}</span>
            <div className="booking-search-modal-value">
              <select
                value={roomsCount}
                onChange={(e) => onRoomsChange(e.target.value)}
                aria-label={t("home.roomsAria")}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? t("booking.room") : t("booking.rooms")}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="booking-search-modal-submit" type="submit">
            {t("booking.searchRooms")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { formatDate } from "@/lib/format";
import { todayISODate } from "@/lib/stay-dates";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type Props = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  compactWhenFilled?: boolean;
};

function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RoomsSearchForm({
  checkIn = "",
  checkOut = "",
  guests = 2,
  compactWhenFilled = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const today = todayISODate();
  const defaultCheckIn = checkIn || today;
  const defaultCheckOut = checkOut || addDaysISO(defaultCheckIn, 1);
  const hasFilledSearch = Boolean(checkIn && checkOut);
  const [editing, setEditing] = useState(!(compactWhenFilled && hasFilledSearch));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextCheckIn = String(form.get("checkIn") || "").trim();
    const nextCheckOut = String(form.get("checkOut") || "").trim();
    const nextGuests = String(form.get("guests") || "2");

    if (!nextCheckIn || !nextCheckOut) {
      setError(t("validation.selectBothDates"));
      return;
    }
    if (nextCheckIn < today) {
      setError(t("validation.selectBothDates"));
      return;
    }
    if (nextCheckOut <= nextCheckIn) {
      setError(t("validation.checkoutAfterCheckin"));
      return;
    }

    setError("");
    setSubmitting(true);
    const qs = new URLSearchParams({
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      guests: nextGuests,
    });
    // Full navigation so the server page reloads with searchParams (vinext/RSC),
    // then jump to the results section.
    window.location.assign(`/rooms?${qs.toString()}#rooms-results`);
  }

  if (compactWhenFilled && hasFilledSearch && !editing) {
    return (
      <div className="hl-rooms-search-summary">
        <div className="search-summary-copy">
          <p className="search-summary-dates">
            {formatDate(checkIn, i18n.language)} –{" "}
            {formatDate(checkOut, i18n.language)}
          </p>
          <p className="search-summary-meta">
            {guests} {guests === 1 ? t("booking.guest") : t("booking.guests")}
          </p>
        </div>
        <button
          type="button"
          className="button outline"
          onClick={() => setEditing(true)}
        >
          {t("booking.updateDates")}
        </button>
      </div>
    );
  }

  return (
    <form
      className="hl-rooms-search"
      method="get"
      action="/rooms"
      onSubmit={onSubmit}
      noValidate
    >
      <label>
        {t("booking.checkIn")}
        <input
          type="date"
          name="checkIn"
          min={today}
          defaultValue={defaultCheckIn}
          required
        />
      </label>
      <label>
        {t("booking.checkOut")}
        <input
          type="date"
          name="checkOut"
          min={defaultCheckIn}
          defaultValue={defaultCheckOut}
          required
        />
      </label>
      <label>
        {t("booking.guests")}
        <select name="guests" defaultValue={guests}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((amount) => (
            <option key={amount} value={amount}>
              {amount}{" "}
              {amount === 1 ? t("booking.guest") : t("booking.guests")}
            </option>
          ))}
        </select>
      </label>
      <div className="hl-rooms-search-actions">
        <button className="button primary" type="submit" disabled={submitting}>
          <Search size={18} aria-hidden="true" />
          {submitting ? t("booking.checkingAvailability") : t("rooms.searchRooms")}
        </button>
        {compactWhenFilled && hasFilledSearch ? (
          <button
            className="button outline"
            type="button"
            onClick={() => {
              setError("");
              setEditing(false);
            }}
          >
            {t("booking.cancelUpdate")}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="form-error hl-rooms-search-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

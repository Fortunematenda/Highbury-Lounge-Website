"use client";

import Link from "next/link";
import { BedDouble, Check, Maximize2, Users } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";
import type { PublicRoomSummary } from "@/lib/rooms";

type Props = {
  room: PublicRoomSummary;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

export function RoomCard({ room, checkIn, checkOut, guests = 2 }: Props) {
  const { t, i18n } = useTranslation();
  const localized = pickTranslated(
    i18n.language as AppLocale,
    {
      name: room.name,
      description: null,
      shortDescription: room.shortDescription,
    },
    room.translationsJson,
  );

  const availabilityQs = new URLSearchParams();
  if (checkIn) availabilityQs.set("checkIn", checkIn);
  if (checkOut) availabilityQs.set("checkOut", checkOut);
  availabilityQs.set("adults", String(guests));
  availabilityQs.set("children", "0");
  availabilityQs.set("rooms", "1");
  availabilityQs.set("roomTypeId", String(room.id));

  const bookHref =
    checkIn && checkOut
      ? `/book?${availabilityQs.toString()}`
      : `/rooms/${room.slug}#availability`;

  const topAmenities = room.amenities.slice(0, 3);

  return (
    <article className="hl-room-card">
      <Link
        href={`/rooms/${room.slug}`}
        className="hl-room-card-media"
        aria-label={localized.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.featuredImage}
          alt={localized.name}
          loading="lazy"
        />
        {room.isFeatured ? (
          <span className="hl-room-card-badge">{t("rooms.featured")}</span>
        ) : null}
        {room.roomsRemaining != null ? (
          <span className="hl-room-card-status">
            {room.roomsRemaining} {t("booking.remaining")}
          </span>
        ) : null}
      </Link>

      <div className="hl-room-card-body">
        <div className="hl-room-card-top">
          <div>
            <h2>
              <Link href={`/rooms/${room.slug}`}>{localized.name}</Link>
            </h2>
            {localized.shortDescription ? (
              <p className="hl-room-card-desc">{localized.shortDescription}</p>
            ) : null}
          </div>
          <div className="hl-room-card-price">
            <strong>
              {formatMoney(room.effectivePrice, room.currency, i18n.language)}
            </strong>
            <span>{t("booking.perNight")}</span>
          </div>
        </div>

        <div className="hl-room-card-meta">
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

        {topAmenities.length > 0 ? (
          <div className="hl-room-card-amenities">
            {topAmenities.map((item) => (
              <span key={item}>
                <Check size={14} aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="hl-room-card-actions">
          <Link href={`/rooms/${room.slug}`} className="button outline">
            {t("rooms.viewRoom")}
          </Link>
          <Link href={bookHref} className="button primary">
            {t("rooms.checkAvailability")}
          </Link>
        </div>
      </div>
    </article>
  );
}

import type { CSSProperties } from "react";

/** Matches the public Upcoming Events card media area. Do not change casually. */
export const EVENT_CARD_IMAGE_ASPECT = "16 / 7";
export const EVENT_CARD_IMAGE_ASPECT_RATIO = 16 / 7;

export type EventImageDisplayMode = "fill" | "contain";

export type EventImageFraming = {
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  imageZoom?: number | null;
  imageDisplayMode?: string | null;
  imageAspectRatio?: string | null;
};

export type NormalizedEventImageFraming = {
  imagePositionX: number;
  imagePositionY: number;
  imageZoom: number;
  imageDisplayMode: EventImageDisplayMode;
  imageAspectRatio: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeEventImageFraming(
  event?: EventImageFraming | null,
): NormalizedEventImageFraming {
  const mode =
    event?.imageDisplayMode === "contain" ? "contain" : "fill";
  return {
    imagePositionX: clamp(Number(event?.imagePositionX ?? 50) || 50, 0, 100),
    imagePositionY: clamp(Number(event?.imagePositionY ?? 50) || 50, 0, 100),
    imageZoom: clamp(Number(event?.imageZoom ?? 1) || 1, 1, 3),
    imageDisplayMode: mode,
    imageAspectRatio: event?.imageAspectRatio?.trim() || "16/7",
  };
}

/** CSS custom properties + styles for public event cards (layout unchanged). */
export function eventCardImageVars(
  event?: EventImageFraming | null,
): CSSProperties {
  const f = normalizeEventImageFraming(event);
  return {
    ["--event-img-x" as string]: `${f.imagePositionX}%`,
    ["--event-img-y" as string]: `${f.imagePositionY}%`,
    ["--event-img-zoom" as string]: String(f.imageZoom),
  };
}

export function eventCardImageClassName(
  event?: EventImageFraming | null,
  extra = "",
): string {
  const f = normalizeEventImageFraming(event);
  return [
    "event-card-media-img",
    f.imageDisplayMode === "contain"
      ? "is-mode-contain"
      : "is-mode-fill",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

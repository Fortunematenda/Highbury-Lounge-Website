import type { CSSProperties, ReactEventHandler } from "react";
import {
  eventCardImageClassName,
  eventCardImageVars,
  normalizeEventImageFraming,
  type EventImageFraming,
} from "@/lib/event-image-framing";

type Props = {
  src: string;
  alt?: string;
  framing?: EventImageFraming | null;
  className?: string;
  loading?: "eager" | "lazy";
  onError?: ReactEventHandler<HTMLImageElement>;
};

/**
 * Renders the event card image with optional blurred backdrop for "contain" mode.
 * Parent must keep the existing landscape container (e.g. .event-card-media).
 */
export function EventCardMediaImage({
  src,
  alt = "",
  framing,
  className,
  loading,
  onError,
}: Props) {
  const mode = normalizeEventImageFraming(framing).imageDisplayMode;
  const vars = eventCardImageVars(framing) as CSSProperties;
  const imgClass = eventCardImageClassName(framing, className);

  return (
    <>
      {mode === "contain" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="event-card-media-blur"
          src={src}
          alt=""
          aria-hidden
          draggable={false}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={imgClass}
        src={src}
        alt={alt}
        loading={loading}
        style={vars}
        draggable={false}
        onError={onError}
      />
    </>
  );
}

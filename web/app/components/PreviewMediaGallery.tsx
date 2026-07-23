"use client";

import { useEffect, useMemo, useState } from "react";

const PREVIEW_LIMIT = 4;

type Props = {
  images: Array<string | null | undefined>;
  alt: string;
  fallback?: string;
  className?: string;
};

function uniqueUrls(images: Array<string | null | undefined>, fallback: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of images) {
    const url = (raw || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  if (out.length === 0) out.push(fallback);
  return out;
}

export function PreviewMediaGallery({
  images,
  alt,
  fallback = "/images/food.jpg",
  className = "",
}: Props) {
  const urls = useMemo(
    () => uniqueUrls(images, fallback),
    [images, fallback],
  );
  const [active, setActive] = useState(urls[0]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActive(urls[0]);
    setExpanded(false);
  }, [urls]);

  const strip = expanded ? urls : urls.slice(0, PREVIEW_LIMIT);
  const extraCount = Math.max(0, urls.length - PREVIEW_LIMIT);

  return (
    <div className={["preview-media-gallery", className].filter(Boolean).join(" ")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="preview-hero" src={active} alt={alt} />

      {urls.length > 1 ? (
        <div className="preview-thumb-row">
          <div className="preview-thumbs" role="list">
            {strip.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                role="listitem"
                className={
                  url === active
                    ? "preview-thumb is-active"
                    : "preview-thumb"
                }
                onClick={() => setActive(url)}
                aria-label={`View image ${index + 1} of ${urls.length}`}
                aria-pressed={url === active}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
              </button>
            ))}
          </div>
          {extraCount > 0 ? (
            <button
              type="button"
              className="preview-show-more"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : `Show more (+${extraCount})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Compact side/gallery strip without a large hero — for list cards. */
export function CompactImageStrip({
  images,
  alt,
  fallback = "/images/deluxe-room.jpg",
  onOpen,
}: {
  images: Array<string | null | undefined>;
  alt: string;
  fallback?: string;
  onOpen?: (url: string) => void;
}) {
  const urls = useMemo(
    () => uniqueUrls(images, fallback),
    [images, fallback],
  );
  const [expanded, setExpanded] = useState(false);
  const strip = expanded ? urls : urls.slice(0, PREVIEW_LIMIT);
  const extraCount = Math.max(0, urls.length - PREVIEW_LIMIT);

  return (
    <div className="compact-image-strip">
      <div className="compact-thumbs" role="list">
        {strip.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            role="listitem"
            className="compact-thumb"
            onClick={() => onOpen?.(url)}
            aria-label={`${alt} image ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
          </button>
        ))}
      </div>
      {extraCount > 0 ? (
        <button
          type="button"
          className="preview-show-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : `Show more (+${extraCount})`}
        </button>
      ) : null}
    </div>
  );
}

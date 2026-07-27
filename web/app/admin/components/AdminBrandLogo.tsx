"use client";

import { useState } from "react";

const LOGO_CANDIDATES = [
  "/images/highbury-lounge-logo-light.png",
  "/images/highbury-lounge-logo.png",
  "/images/logo.jpg",
] as const;

export function AdminBrandLogo({
  className = "admin-brand-logo",
  alt = "Highbury Lounge",
  preferDark = false,
}: {
  className?: string;
  alt?: string;
  /** Use the dark logo when placed on a light background (app bar). */
  preferDark?: boolean;
}) {
  const sources = preferDark
    ? ([
        "/images/highbury-lounge-logo.png",
        "/images/highbury-lounge-logo-light.png",
        "/images/logo.jpg",
      ] as const)
    : LOGO_CANDIDATES;

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || index >= sources.length) {
    return (
      <span className="admin-brand-fallback" aria-label={alt}>
        Highbury Lounge
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={`${sources[index]}?v=5`}
      alt={alt}
      onError={() => {
        if (index + 1 >= sources.length) setFailed(true);
        else setIndex((i) => i + 1);
      }}
    />
  );
}

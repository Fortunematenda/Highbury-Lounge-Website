"use client";

import { useEffect } from "react";

/** Scroll to results after a rooms search navigation. */
export function RoomsResultsScroll({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const el = document.getElementById("rooms-results");
    if (!el) return;
    // Wait a tick for layout/images shell to settle.
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [active]);

  return null;
}

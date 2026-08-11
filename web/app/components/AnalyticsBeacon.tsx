"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "hl_vid";

function readVisitorId() {
  try {
    const fromStorage = window.localStorage.getItem(VISITOR_KEY);
    if (fromStorage) return fromStorage;
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(/(?:^|;\s*)hl_vid=([^;]+)/);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return "";
}

function persistVisitorId(id: string) {
  try {
    window.localStorage.setItem(VISITOR_KEY, id);
  } catch {
    /* ignore */
  }
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const visitorId = readVisitorId();
      void fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || "",
          title: document.title || "",
          visitorId: visitorId || undefined,
        }),
        signal: controller.signal,
        keepalive: true,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (data?.visitorId) persistVisitorId(String(data.visitorId));
        })
        .catch(() => undefined);
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pathname]);

  return null;
}

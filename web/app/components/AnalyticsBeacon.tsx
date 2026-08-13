"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "hl_vid";
const GEO_KEY = "hl_geo_v1";

type ClientGeo = {
  ip?: string;
  country?: string;
};

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

function readCachedGeo(): ClientGeo | null {
  try {
    const raw = window.sessionStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientGeo;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function persistGeo(geo: ClientGeo) {
  try {
    window.sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
  } catch {
    /* ignore */
  }
}

/** Resolve visitor IP/country in the browser (works without CDN geo headers). */
async function resolveClientGeo(): Promise<ClientGeo> {
  const cached = readCachedGeo();
  if (cached?.ip || cached?.country) return cached;

  const controllers = [
    async (): Promise<ClientGeo> => {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 2500);
      try {
        const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
        if (!res.ok) return {};
        const data = (await res.json()) as {
          success?: boolean;
          ip?: string;
          country_code?: string;
        };
        if (data.success === false) return {};
        return {
          ip: data.ip,
          country: data.country_code?.toUpperCase(),
        };
      } finally {
        window.clearTimeout(timer);
      }
    },
    async (): Promise<ClientGeo> => {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 2500);
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
        if (!res.ok) return {};
        const data = (await res.json()) as {
          ip?: string;
          country_code?: string;
          error?: boolean;
        };
        if (data.error) return {};
        return {
          ip: data.ip,
          country: data.country_code?.toUpperCase(),
        };
      } finally {
        window.clearTimeout(timer);
      }
    },
  ];

  for (const run of controllers) {
    try {
      const geo = await run();
      if (geo.ip || geo.country) {
        persistGeo(geo);
        return geo;
      }
    } catch {
      /* try next */
    }
  }

  const empty = {};
  persistGeo(empty);
  return empty;
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        const visitorId = readVisitorId();
        const geo = await resolveClientGeo();
        try {
          const res = await fetch("/api/analytics/pageview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: pathname,
              referrer: document.referrer || "",
              title: document.title || "",
              visitorId: visitorId || undefined,
              ip: geo.ip || undefined,
              country: geo.country || undefined,
            }),
            signal: controller.signal,
            keepalive: true,
          });
          const data = await res.json().catch(() => ({}));
          if (data?.visitorId) persistVisitorId(String(data.visitorId));
        } catch {
          /* ignore */
        }
      })();
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pathname]);

  return null;
}

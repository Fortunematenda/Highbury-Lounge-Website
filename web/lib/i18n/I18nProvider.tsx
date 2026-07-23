"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/locales";
import { resources, type Namespace } from "@/lib/i18n/resources";

type Dict = Record<string, unknown>;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Dict)) {
      return (acc as Dict)[part];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`,
  );
}

function resolveKey(locale: AppLocale, key: string): string | undefined {
  const [nsOrFirst, ...rest] = key.split(".");
  const namespaces = Object.keys(resources[locale]) as Namespace[];

  // Support "booking.checkIn" (namespace.key) and "checkIn" within common fallback
  if (rest.length && namespaces.includes(nsOrFirst as Namespace)) {
    const ns = nsOrFirst as Namespace;
    const path = rest.join(".");
    const fromLocale = getByPath(resources[locale][ns] as Dict, path);
    if (typeof fromLocale === "string") return fromLocale;
    const fromEn = getByPath(resources.en[ns] as Dict, path);
    if (typeof fromEn === "string") return fromEn;
  }

  for (const ns of namespaces) {
    const fromLocale = getByPath(resources[locale][ns] as Dict, key);
    if (typeof fromLocale === "string") return fromLocale;
  }
  for (const ns of namespaces) {
    const fromEn = getByPath(resources.en[ns] as Dict, key);
    if (typeof fromEn === "string") return fromEn;
  }
  return undefined;
}

function writeLocalePreference(locale: AppLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale;
}

function readInitialLocale(initial?: AppLocale | null): AppLocale {
  if (initial && isAppLocale(initial)) return initial;
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  const cookieMatch = document.cookie.match(/(?:^|;\s*)hl_locale=([^;]+)/);
  const cookieVal = cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : null;
  if (isAppLocale(cookieVal)) return cookieVal;
  return detectBrowserLocale(navigator.language);
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: AppLocale | null;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    initialLocale && isAppLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readInitialLocale(initialLocale);
    writeLocalePreference(next);
    startTransition(() => {
      setLocaleState(next);
      setReady(true);
    });
  }, [initialLocale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    writeLocalePreference(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolveKey(locale, key) ?? resolveKey("en", key) ?? key;
      return interpolate(value, params);
    },
    [locale],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = t("common.meta.siteTitle");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", t("common.meta.siteDescription"));
    }
  }, [locale, t]);

  const value = useMemo(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

/** react-i18next-compatible helper */
export function useTranslation(_ns?: string) {
  const { t, locale, setLocale, ready } = useI18n();
  return {
    t,
    i18n: {
      language: locale,
      changeLanguage: async (lng: string) => {
        if (isAppLocale(lng)) setLocale(lng);
      },
    },
    ready,
  };
}

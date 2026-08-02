"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  parseAppLocale,
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
const LOCALE_CHANGE_EVENT = "hl-locale-change";

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
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  // Max-Age 1 year; Path=/ so SSR layout cookies() can read it on refresh.
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

export function I18nProvider({
  children,
}: {
  children: ReactNode;
  initialLocale?: AppLocale | null;
}) {
  // Public language switcher is disabled for now — keep the site on English.
  const [locale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    writeLocalePreference(DEFAULT_LOCALE);
    document.documentElement.lang = DEFAULT_LOCALE;
    setReady(true);
  }, []);

  const setLocale = useCallback((_next: AppLocale) => {
    // Language switching is temporarily disabled.
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolveKey(locale, key) ?? resolveKey("en", key) ?? key;
      return interpolate(value, params);
    },
    [locale],
  );

  useLayoutEffect(() => {
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
        const next = parseAppLocale(lng);
        if (next) setLocale(next);
      },
    },
    ready,
  };
}

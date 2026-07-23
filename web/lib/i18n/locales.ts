export const LOCALES = ["en", "zh-CN", "sn", "nd"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "hl_locale";
export const LOCALE_COOKIE = "hl_locale";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  "zh-CN": "中文",
  sn: "Shona",
  nd: "Ndebele",
};

export const LOCALE_NATIVE_NAMES: Record<AppLocale, string> = {
  en: "English",
  "zh-CN": "Simplified Chinese",
  sn: "Shona",
  nd: "Ndebele",
};

/** BCP 47 tags for Intl formatters */
export const INTL_LOCALE: Record<AppLocale, string> = {
  en: "en-GB",
  "zh-CN": "zh-CN",
  sn: "en-GB",
  nd: "en-GB",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function detectBrowserLocale(navLang?: string | null): AppLocale {
  const lang = (navLang || "").toLowerCase();
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("sn")) return "sn";
  if (lang.startsWith("nd") || lang.startsWith("nr")) return "nd";
  if (lang.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export function readLocaleCookie(cookieHeader?: string | null): AppLocale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)hl_locale=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isAppLocale(value) ? value : null;
}

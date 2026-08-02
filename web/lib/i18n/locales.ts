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

/** Accepts exact codes plus common aliases / casing (zh-cn, zh_CN, etc.). */
export function parseAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  let raw = value.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  raw = raw.trim().replace(/^["']|["']$/g, "");
  if (isAppLocale(raw)) return raw;

  const lower = raw.toLowerCase().replace(/_/g, "-");
  if (lower === "zh" || lower.startsWith("zh-")) return "zh-CN";
  if (lower === "sn" || lower.startsWith("sn-")) return "sn";
  if (lower === "nd" || lower === "nr" || lower.startsWith("nd-") || lower.startsWith("nr-")) {
    return "nd";
  }
  if (lower === "en" || lower.startsWith("en-")) return "en";
  return null;
}

export function detectBrowserLocale(navLang?: string | null): AppLocale {
  return parseAppLocale(navLang) ?? DEFAULT_LOCALE;
}

export function readLocaleCookie(cookieHeader?: string | null): AppLocale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1] ? match[1] : null;
  return parseAppLocale(value);
}

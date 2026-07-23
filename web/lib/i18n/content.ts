import type { AppLocale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

export type FieldTranslation = {
  name?: string;
  description?: string;
  shortDescription?: string;
  features?: string;
};

export type ContentTranslations = Partial<Record<AppLocale, FieldTranslation>>;

export function parseTranslationsJson(
  raw: string | null | undefined,
): ContentTranslations {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ContentTranslations;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function stringifyTranslations(translations: ContentTranslations) {
  return JSON.stringify(translations);
}

/** Normalise API body value into a JSON string or null; undefined means leave unchanged. */
export function normalizeTranslationsJson(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return null;
}

/** Pick localized field with English/base fallback */
export function pickTranslated(
  locale: AppLocale,
  base: { name: string; description?: string | null; shortDescription?: string | null },
  translationsJson?: string | null,
): { name: string; description: string; shortDescription: string } {
  const translations = parseTranslationsJson(translationsJson);
  const localized = translations[locale];
  const en = translations.en;

  return {
    name: localized?.name || en?.name || base.name,
    description:
      localized?.description ||
      en?.description ||
      base.description ||
      "",
    shortDescription:
      localized?.shortDescription ||
      en?.shortDescription ||
      base.shortDescription ||
      "",
  };
}

export function ensureEnglishBase(
  translations: ContentTranslations,
  base: FieldTranslation,
): ContentTranslations {
  return {
    ...translations,
    [DEFAULT_LOCALE]: {
      name: base.name || translations.en?.name || "",
      description: base.description ?? translations.en?.description ?? "",
      shortDescription:
        base.shortDescription ?? translations.en?.shortDescription ?? "",
      features: base.features ?? translations.en?.features,
    },
  };
}

"use client";

import { LOCALES, LOCALE_LABELS, type AppLocale } from "@/lib/i18n/locales";
import {
  parseTranslationsJson,
  type ContentTranslations,
  type FieldTranslation,
} from "@/lib/i18n/content";

type Props = {
  lang: AppLocale;
  onChange: (lang: AppLocale) => void;
  translations: ContentTranslations;
  missingHint?: boolean;
};

export function AdminLangTabs({
  lang,
  onChange,
  translations,
  missingHint = true,
}: Props) {
  return (
    <div className="admin-tabs admin-lang-tabs" role="tablist" aria-label="Languages">
      {LOCALES.map((code) => {
        const has =
          code === "en" ||
          Boolean(
            translations[code]?.name ||
              translations[code]?.description ||
              translations[code]?.shortDescription ||
              translations[code]?.features,
          );
        const incomplete = missingHint && code !== "en" && !has;
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={lang === code}
            className={`admin-tab${lang === code ? " active" : ""}${incomplete ? " is-incomplete" : ""}`}
            onClick={() => onChange(code)}
            title={
              code === "en"
                ? "Primary language"
                : incomplete
                  ? "Not translated yet"
                  : undefined
            }
          >
            <span>{LOCALE_LABELS[code]}</span>
            {code === "en" ? (
              <em className="admin-lang-primary">Primary</em>
            ) : null}
            {incomplete ? (
              <span className="admin-lang-dot" aria-label="Not translated yet" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function buildTranslationDraft(
  base: FieldTranslation,
  translationsJson?: string | null,
) {
  const initial = parseTranslationsJson(translationsJson);
  if (!initial.en) {
    initial.en = {
      name: base.name || "",
      description: base.description || "",
      shortDescription: base.shortDescription || "",
    };
  }
  return initial;
}

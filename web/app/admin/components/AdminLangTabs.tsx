"use client";

import { LOCALES, LOCALE_NATIVE_NAMES, type AppLocale } from "@/lib/i18n/locales";
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
    <div className="pms-lang-chips" role="tablist" aria-label="Languages">
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
        const selected = lang === code;
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`pms-lang-chip${selected ? " is-active" : ""}${incomplete ? " is-incomplete" : ""}`}
            onClick={() => onChange(code)}
            title={
              code === "en"
                ? "Primary language"
                : incomplete
                  ? "Not translated yet"
                  : undefined
            }
          >
            <span>{LOCALE_NATIVE_NAMES[code] || code}</span>
            {selected ? <span className="pms-lang-check" aria-hidden>✓</span> : null}
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

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  LOCALES,
  LOCALE_LABELS,
  type AppLocale,
} from "@/lib/i18n/locales";

type Props = {
  variant?: "header" | "panel" | "compact";
};

export function LanguageSelector({ variant = "header" }: Props) {
  const { i18n, t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = i18n.language as AppLocale;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`language-selector language-selector--${variant}${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="language-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("language.label")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="language-selector-globe" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M3 12h18M12 3c2.5 2.4 3.8 5.1 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.1-3.8-9S9.5 5.4 12 3z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </span>
        <span className="language-selector-current">{LOCALE_LABELS[current]}</span>
        <span className="language-selector-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      <ul
        id={listId}
        className="language-selector-menu"
        role="listbox"
        aria-label={t("language.label")}
        hidden={!open}
      >
        {LOCALES.map((locale) => (
          <li key={locale} role="option" aria-selected={locale === current}>
            <button
              type="button"
              className={locale === current ? "is-active" : undefined}
              onClick={() => {
                void i18n.changeLanguage(locale);
                setOpen(false);
              }}
            >
              {LOCALE_LABELS[locale]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

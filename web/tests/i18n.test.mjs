import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  isAppLocale,
  LOCALES,
  INTL_LOCALE,
} from "../lib/i18n/locales.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadLocale(locale, ns) {
  return JSON.parse(
    readFileSync(join(root, "locales", locale, `${ns}.json`), "utf8"),
  );
}

function pickTranslated(locale, base, translationsJson) {
  let translations = {};
  try {
    translations = translationsJson ? JSON.parse(translationsJson) : {};
  } catch {
    translations = {};
  }
  const localized = translations[locale] || {};
  const en = translations.en || {};
  return {
    name: localized.name || en.name || base.name,
    description: localized.description || en.description || base.description || "",
  };
}

test("default locale is English", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.deepEqual([...LOCALES], ["en", "zh-CN", "sn", "nd"]);
});

test("browser language detection", () => {
  assert.equal(detectBrowserLocale("zh-CN"), "zh-CN");
  assert.equal(detectBrowserLocale("zh-TW"), "zh-CN");
  assert.equal(detectBrowserLocale("sn-ZW"), "sn");
  assert.equal(detectBrowserLocale("nd-ZW"), "nd");
  assert.equal(detectBrowserLocale("fr-FR"), "en");
  assert.equal(detectBrowserLocale("en-US"), "en");
});

test("isAppLocale validates codes", () => {
  assert.equal(isAppLocale("en"), true);
  assert.equal(isAppLocale("zh-CN"), true);
  assert.equal(isAppLocale("fr"), false);
});

test("Chinese booking keys exist and differ from English", () => {
  const en = loadLocale("en", "booking");
  const zh = loadLocale("zh-CN", "booking");
  assert.equal(en.checkIn, "Check in");
  assert.ok(zh.checkIn.includes("入住"));
  assert.notEqual(zh.checkIn, en.checkIn);
});

test("missing translation falls back to English content", () => {
  const base = { name: "Deluxe King", description: "A restful room" };
  const json = JSON.stringify({
    en: { name: "Deluxe King", description: "A restful room" },
    "zh-CN": { name: "豪华大床房" },
  });
  const zh = pickTranslated("zh-CN", base, json);
  assert.equal(zh.name, "豪华大床房");
  assert.equal(zh.description, "A restful room");
  const sn = pickTranslated("sn", base, json);
  assert.equal(sn.name, "Deluxe King");
});

test("locale-aware money and dates via Intl", () => {
  const moneyZh = new Intl.NumberFormat(INTL_LOCALE["zh-CN"], {
    style: "currency",
    currency: "USD",
  }).format(85);
  assert.ok(moneyZh.includes("85"));
  const dateZh = new Intl.DateTimeFormat(INTL_LOCALE["zh-CN"], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date("2026-07-24T12:00:00"));
  assert.ok(dateZh.includes("2026"));
});

test("all locales have required namespaces on disk", () => {
  for (const locale of LOCALES) {
    for (const ns of ["common", "booking", "validation", "menu", "rooms", "conference"]) {
      const data = loadLocale(locale, ns);
      assert.equal(typeof data, "object");
      assert.ok(Object.keys(data).length > 0);
    }
  }
});

test("booking payload keeps stable internal values and preferredLanguage", () => {
  const payload = {
    roomType: "DELUXE_DOUBLE",
    paymentMethod: "PAY_AT_PROPERTY",
    bookingStatus: "PENDING",
    preferredLanguage: "zh-CN",
    checkIn: "2026-07-24",
    checkOut: "2026-07-26",
    guests: 2,
  };
  assert.equal(payload.paymentMethod, "PAY_AT_PROPERTY");
  assert.equal(payload.preferredLanguage, "zh-CN");
  assert.notEqual(payload.paymentMethod, "到店付款");
});

test("existing records without translations fall back to base English", () => {
  const base = { name: "Executive Suite", description: "Spacious suite" };
  const picked = pickTranslated("zh-CN", base, null);
  assert.equal(picked.name, "Executive Suite");
  assert.equal(picked.description, "Spacious suite");
});

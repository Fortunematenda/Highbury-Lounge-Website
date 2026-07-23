"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LanguageSelector } from "@/lib/i18n/LanguageSelector";
import { useTranslation } from "@/lib/i18n/I18nProvider";

function SuccessInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  return (
    <main className="booking-flow">
      <section className="booking-flow-panel success-panel">
        <LanguageSelector variant="panel" />
        <span className="success-mark">✓</span>
        <h1>{t("conference.enquiryReceived")}</h1>
        <p>{t("conference.enquiryThanksWithRef", { reference })}</p>
        <Link className="button primary" href="/">
          {t("actions.returnHome")}
        </Link>
      </section>
    </main>
  );
}

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <main className="booking-flow">
      <p>{t("booking.loading")}</p>
    </main>
  );
}

export default function ConferenceSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessInner />
    </Suspense>
  );
}

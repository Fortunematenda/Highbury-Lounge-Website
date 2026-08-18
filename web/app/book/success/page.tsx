"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/I18nProvider";

function whatsappHref(whatsapp: string, message: string) {
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits || "263786957068"}?text=${encodeURIComponent(message)}`;
}

function SuccessInner() {
  const { t, i18n } = useTranslation();
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const total = Number(params.get("total") ?? "0");
  const currency = params.get("currency") ?? "USD";
  const paid = params.get("paid") === "1";
  const [whatsapp, setWhatsapp] = useState("+263786957068");

  useEffect(() => {
    void fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.whatsapp) setWhatsapp(data.settings.whatsapp);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel success-panel">
        <BackLink href="/" label={t("actions.back")} />
        <span className="success-mark">✓</span>
        <p className="eyebrow">Highbury Lounge</p>
        <h1>
          {paid ? "Payment received" : t("booking.reservationReceived")}
        </h1>
        <p>
          {paid
            ? `Thank you. Booking ${reference} is paid.`
            : t("booking.thankYouPending", { reference })}
        </p>
        <p>
          {t("booking.estimatedTotal")}:{" "}
          <strong>{formatMoney(total, currency, i18n.language)}</strong>
        </p>
        {!paid ? <p className="muted">{t("booking.paymentDisclaimer")}</p> : null}
        <div className="hero-actions">
          <Link className="button primary" href="/">
            {t("actions.returnHome")}
          </Link>
          <Link className="button outline" href="/book/find">
            Find my booking
          </Link>
          <a
            className="button ghost"
            href={whatsappHref(
              whatsapp,
              t("booking.whatsappBookingMessage", { reference }),
            )}
            target="_blank"
            rel="noreferrer"
          >
            {t("actions.whatsapp")}
          </a>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          Lost this page? Search later with reference{" "}
          <strong>{reference}</strong> at{" "}
          <Link href="/book/find">Find my booking</Link>.
        </p>
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

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessInner />
    </Suspense>
  );
}

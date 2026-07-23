"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatMoney } from "@/lib/format";

function SuccessInner() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const total = Number(params.get("total") ?? "0");
  const currency = params.get("currency") ?? "USD";

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel success-panel">
        <span className="success-mark">✓</span>
        <p className="eyebrow">Highbury Lounge</p>
        <h1>Reservation received</h1>
        <p>
          Thank you. Your booking request <strong>{reference}</strong> is now{" "}
          <strong>Pending</strong> and awaiting confirmation from our team.
        </p>
        <p>
          Estimated stay total: <strong>{formatMoney(total, currency)}</strong>
        </p>
        <p className="muted">
          No payment has been completed online. We will contact you to confirm availability
          and share payment options.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/">
            Return home
          </Link>
          <a
            className="button ghost"
            href={`https://wa.me/263786957068?text=${encodeURIComponent(
              `Hello Highbury Lounge, my booking reference is ${reference}.`,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp us
          </a>
        </div>
      </section>
    </main>
  );
}

export default function BookSuccessPage() {
  return (
    <Suspense fallback={<main className="booking-flow"><p>Loading…</p></main>}>
      <SuccessInner />
    </Suspense>
  );
}

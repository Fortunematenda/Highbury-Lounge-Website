"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  return (
    <main className="booking-flow">
      <section className="booking-flow-panel success-panel">
        <span className="success-mark">✓</span>
        <h1>Enquiry received</h1>
        <p>
          Thank you. Your conference enquiry <strong>{reference}</strong> has been
          sent to our events team. We will prepare a quotation and contact you.
        </p>
        <Link className="button primary" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}

export default function ConferenceSuccessPage() {
  return (
    <Suspense fallback={<main className="booking-flow"><p>Loading…</p></main>}>
      <SuccessInner />
    </Suspense>
  );
}

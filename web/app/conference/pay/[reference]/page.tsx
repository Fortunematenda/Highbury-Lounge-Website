"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { formatMoney } from "@/lib/format";

type EnquiryView = {
  reference: string;
  contactName: string;
  email: string;
  eventType: string;
  preferredDate: string;
  attendees: number;
  status: string;
  paymentStatus: string;
  quotationAmount: number | null;
  quotationNotes: string | null;
};

function ConferencePayInner() {
  const params = useParams<{ reference: string }>();
  const search = useSearchParams();
  const reference = String(params.reference || "").toUpperCase();
  const paidFlag = search.get("paid") === "1";
  const [enquiry, setEnquiry] = useState<EnquiryView | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  // const [paying, setPaying] = useState(false); // Paynow — enable at go-live
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!reference) return;
    void (async () => {
      try {
        const res = await fetch(
          `/api/conference/${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Enquiry not found");
        setEnquiry(data.enquiry);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Enquiry not found");
      }
    })();
  }, [reference]);

  function confirmEmail(e: FormEvent) {
    e.preventDefault();
    if (!enquiry) return;
    if (email.trim().toLowerCase() !== enquiry.email.toLowerCase()) {
      setError("Email does not match this enquiry.");
      return;
    }
    setError("");
    setUnlocked(true);
  }

  // Paynow guest checkout — restore when PAYNOW_ENABLED=true (go-live).
  // async function payNow() {
  //   if (!enquiry || paying) return;
  //   setPaying(true);
  //   setError("");
  //   try {
  //     const res = await fetch("/api/payments/paynow/initiate", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         entityType: "conference",
  //         reference: enquiry.reference,
  //         email: enquiry.email,
  //       }),
  //     });
  //     const data = await res.json().catch(() => ({}));
  //     if (!res.ok) throw new Error(data.error || "Could not start payment");
  //     if (data.redirectUrl) {
  //       window.location.href = data.redirectUrl as string;
  //       return;
  //     }
  //     throw new Error("Payment redirect missing");
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Could not start payment");
  //     setPaying(false);
  //   }
  // }

  const amount = Number(enquiry?.quotationAmount || 0);
  const paid = paidFlag || enquiry?.paymentStatus === "paid";
  // const canPay = unlocked && amount > 0 && !paid;

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink href="/conference" label="Back" />
        <p className="eyebrow">Conference quotation</p>
        <h1>{paid ? "Payment received" : "Your quotation"}</h1>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {enquiry ? (
          <>
            <p>
              Reference <strong>{enquiry.reference}</strong> · {enquiry.eventType}{" "}
              on {enquiry.preferredDate}
            </p>
            <p>
              Quotation:{" "}
              <strong>
                {amount > 0 ? formatMoney(amount, "USD") : "Not set yet"}
              </strong>
            </p>
            {enquiry.quotationNotes ? (
              <p className="muted">{enquiry.quotationNotes}</p>
            ) : null}
            <p className="muted">Payment status: {enquiry.paymentStatus}</p>

            {!unlocked && !paid ? (
              <form
                className="guest-form"
                onSubmit={confirmEmail}
                style={{ marginTop: 18 }}
              >
                <label>
                  Confirm your email to continue
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <button className="button primary" type="submit">
                  Continue
                </button>
              </form>
            ) : null}

            {unlocked && !paid ? (
              <p className="muted" style={{ marginTop: 12 }}>
                Please pay by bank transfer using reference{" "}
                <strong>{enquiry.reference}</strong>, or contact us to arrange
                payment.
              </p>
            ) : null}

            <div className="hero-actions" style={{ marginTop: 18 }}>
              {/* Paynow CTA — uncomment when PAYNOW_ENABLED=true for go-live
              {canPay ? (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void payNow()}
                  disabled={paying}
                >
                  {paying ? "Redirecting…" : "Pay now with Paynow"}
                </button>
              ) : null}
              */}
              <Link className="button primary" href="/">
                Return home
              </Link>
              <Link className="button outline" href="/conference">
                Back to conference
              </Link>
            </div>
          </>
        ) : !error ? (
          <p className="muted">Loading…</p>
        ) : null}
      </section>
    </main>
  );
}

export default function ConferencePayPage() {
  return (
    <Suspense
      fallback={
        <main className="booking-flow">
          <p>Loading…</p>
        </main>
      }
    >
      <ConferencePayInner />
    </Suspense>
  );
}

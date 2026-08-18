"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { formatMoney } from "@/lib/format";

type FoodOrderView = {
  reference: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  guestName: string | null;
  serviceDate: string | null;
  serviceTime: string | null;
  bookingId: number | null;
};

function FoodOrderInner() {
  const params = useParams<{ reference: string }>();
  const search = useSearchParams();
  const reference = String(params.reference || "").toUpperCase();
  const paidFlag = search.get("paid") === "1";
  const [order, setOrder] = useState<FoodOrderView | null>(null);
  const [items, setItems] = useState<
    Array<{ name: string; quantity: number; totalPrice: number }>
  >([]);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!reference) return;
    void (async () => {
      try {
        const res = await fetch(
          `/api/food-orders/${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Order not found");
        setOrder(data.order);
        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Order not found");
      }
    })();
  }, [reference]);

  async function payNow() {
    if (!order || paying) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/paynow/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "food_order",
          reference: order.reference,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl as string;
        return;
      }
      throw new Error("Payment redirect missing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setPaying(false);
    }
  }

  const paid =
    paidFlag || order?.paymentStatus === "paid" || Boolean(order?.bookingId);

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel success-panel">
        <BackLink href="/#dine-menu" label="Back to menu" />
        <p className="eyebrow">Food pre-order</p>
        <h1>{paid ? "Order confirmed" : "Complete payment"}</h1>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {order ? (
          <>
            <p>
              Reference <strong>{order.reference}</strong>
              {order.guestName ? ` · ${order.guestName}` : ""}
            </p>
            <p>
              Total:{" "}
              <strong>
                {formatMoney(order.totalAmount, order.currency)}
              </strong>
            </p>
            <p className="muted">
              Payment: {order.paymentStatus}
              {order.bookingId
                ? " (included with room booking)"
                : ""}
            </p>
            <ul>
              {items.map((item) => (
                <li key={`${item.name}-${item.quantity}`}>
                  {item.quantity}× {item.name} —{" "}
                  {formatMoney(item.totalPrice, order.currency)}
                </li>
              ))}
            </ul>
            <div className="hero-actions">
              {!paid && !order.bookingId ? (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void payNow()}
                  disabled={paying}
                >
                  {paying ? "Redirecting…" : "Pay now"}
                </button>
              ) : (
                <Link className="button primary" href="/">
                  Return home
                </Link>
              )}
              <Link className="button outline" href="/#dine-menu">
                Back to menu
              </Link>
            </div>
          </>
        ) : !error ? (
          <p className="muted">Loading order…</p>
        ) : null}
      </section>
    </main>
  );
}

export default function FoodOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="booking-flow">
          <p>Loading…</p>
        </main>
      }
    >
      <FoodOrderInner />
    </Suspense>
  );
}

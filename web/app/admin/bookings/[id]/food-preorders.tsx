"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, UtensilsCrossed } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { DetailSectionCard, StatusBadge } from "@/app/admin/components/detail-page";

type FoodLine = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string | null;
  imageUrl?: string | null;
};

type Props = {
  currency: string;
  reference: string | null;
  status: string | null;
  foodOrderId: number | null;
  specialInstructions: string | null;
  totalAmount: number;
  items: FoodLine[];
};

export function BookingFoodPreOrders({
  currency,
  reference,
  status,
  foodOrderId,
  specialInstructions,
  totalAmount,
  items,
}: Props) {
  const [open, setOpen] = useState(true);
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  if (!items.length) {
    return (
      <DetailSectionCard title="Food Pre-Orders" icon={UtensilsCrossed}>
        <p className="admin-empty">No food pre-ordered with this booking.</p>
      </DetailSectionCard>
    );
  }

  return (
    <DetailSectionCard
      title="Food Pre-Orders"
      icon={UtensilsCrossed}
      headerAction={
        <div className="admin-actions">
          {status ? <StatusBadge status={status} /> : null}
          {foodOrderId ? (
            <Link className="admin-btn ghost" href={`/admin/food-orders/${foodOrderId}`}>
              Open food order
            </Link>
          ) : null}
          <button
            type="button"
            className="admin-btn ghost"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      }
    >
      {reference ? (
        <p className="page-sub" style={{ marginTop: 0 }}>
          Order {reference} · {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      ) : null}

      {open ? (
        <>
          <ul className="admin-food-order-list">
            {items.map((item) => (
              <li key={item.id} className="admin-food-order-item">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="admin-food-order-thumb" />
                ) : (
                  <div className="admin-food-order-thumb is-empty" aria-hidden />
                )}
                <div className="admin-food-order-body">
                  <strong>
                    {item.name} ×{item.quantity}
                  </strong>
                  <span className="admin-muted">
                    {formatMoney(item.unitPrice, currency)} each
                  </span>
                  {item.specialInstructions ? (
                    <p className="admin-muted">{item.specialInstructions}</p>
                  ) : null}
                </div>
                <div className="admin-food-order-price">
                  {formatMoney(item.totalPrice, currency)}
                </div>
              </li>
            ))}
          </ul>

          <dl className="admin-dl" style={{ marginTop: 16 }}>
            <div>
              <dt>Total food cost</dt>
              <dd>
                <strong>{formatMoney(totalAmount, currency)}</strong>
              </dd>
            </div>
            <div>
              <dt>Special instructions</dt>
              <dd>{specialInstructions || "—"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="admin-muted">
          {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
          {formatMoney(totalAmount, currency)}
        </p>
      )}
    </DetailSectionCard>
  );
}

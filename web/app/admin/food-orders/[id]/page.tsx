import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, UtensilsCrossed } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import {
  formatAuditActorLabel,
  getLatestEntityChange,
} from "@/lib/audit";
import { getFoodOrderDetail } from "@/lib/food-orders";
import { formatMoney } from "@/lib/format";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { FoodOrderStatusForm } from "./status-form";

export const dynamic = "force-dynamic";

export default async function AdminFoodOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const { id } = await params;
  const foodOrderId = Number(id);
  if (!Number.isFinite(foodOrderId)) notFound();

  const detail = await getFoodOrderDetail(foodOrderId);
  if (!detail) notFound();

  const { order, items, booking } = detail;
  const lastChange = await getLatestEntityChange("food_order", foodOrderId);

  return (
    <DetailPageShell
      pageTitle={`Food order ${order.reference}`}
      breadcrumbs={[
        { label: "Food Orders", href: "/admin/food-orders" },
        { label: order.reference },
      ]}
      title={order.reference}
      description={`${order.guestName || "Guest"} · ${formatMoney(order.totalAmount, order.currency)}`}
      status={<StatusBadge status={order.status} />}
      backAction={{ label: "Back to food orders", href: "/admin/food-orders" }}
      sidebar={
        <>
          <section className="admin-card detail-section-card">
            <div className="detail-section-head">
              <div>
                <h2>Summary</h2>
              </div>
            </div>
            <dl className="detail-meta-list">
              <div>
                <dt>Guest</dt>
                <dd>{order.guestName || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{order.guestPhone || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.guestEmail || "—"}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>
                  {[order.serviceDate, order.serviceTime, order.serviceType]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  <strong>
                    {formatMoney(order.totalAmount, order.currency)}
                  </strong>
                </dd>
              </div>
              {booking ? (
                <div>
                  <dt>Booking</dt>
                  <dd>
                    <Link href={`/admin/bookings/${booking.id}`}>
                      {booking.reference}
                    </Link>
                    <div className="admin-muted">{booking.status}</div>
                  </dd>
                </div>
              ) : null}
              {booking?.roomName ? (
                <div>
                  <dt>Room</dt>
                  <dd>{booking.roomName}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <DetailMetadataCard
            items={[
              { label: "Created", value: order.createdAt },
              { label: "Last updated", value: order.updatedAt },
              {
                label: "Last changed by",
                value: lastChange?.actor
                  ? `${formatAuditActorLabel(lastChange.actor)}${
                      lastChange.actor.email
                        ? ` · ${lastChange.actor.email}`
                        : ""
                    }`
                  : null,
              },
            ]}
          />
        </>
      }
    >
      <div className="detail-form-stack">
        <DetailSectionCard title="Ordered items" icon={UtensilsCrossed}>
          <ul className="admin-food-order-list">
            {items.map((item) => (
              <li key={item.id} className="admin-food-order-item">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="admin-food-order-thumb"
                  />
                ) : (
                  <div className="admin-food-order-thumb is-empty" aria-hidden />
                )}
                <div className="admin-food-order-body">
                  <strong>
                    {item.name} ×{item.quantity}
                  </strong>
                  <span className="admin-muted">
                    {formatMoney(item.unitPrice, order.currency)} each
                  </span>
                  {item.specialInstructions ? (
                    <p className="admin-muted">{item.specialInstructions}</p>
                  ) : null}
                </div>
                <div className="admin-food-order-price">
                  {formatMoney(item.totalPrice, order.currency)}
                </div>
              </li>
            ))}
          </ul>
          <dl className="admin-dl" style={{ marginTop: 16 }}>
            <div>
              <dt>Special instructions</dt>
              <dd>{order.specialInstructions || "—"}</dd>
            </div>
            <div>
              <dt>Total food cost</dt>
              <dd>
                <strong>
                  {formatMoney(order.totalAmount, order.currency)}
                </strong>
              </dd>
            </div>
          </dl>
        </DetailSectionCard>

        <DetailSectionCard title="Order status" icon={ClipboardList}>
          <FoodOrderStatusForm
            foodOrderId={order.id}
            currentStatus={order.status}
          />
        </DetailSectionCard>
      </div>
    </DetailPageShell>
  );
}

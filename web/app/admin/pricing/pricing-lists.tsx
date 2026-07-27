"use client";

import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatMoney } from "@/lib/format";

type RoomRate = {
  id: number;
  name: string;
  pricePerNight: number;
  promotionalPrice: number | null;
};

type RuleRow = {
  id: number;
  name: string;
  roomName: string | null;
  ruleType: string;
  amount: number;
  isPercentage: boolean;
  isActive: boolean;
};

export function PricingLists({
  rooms,
  rules,
}: {
  rooms: RoomRate[];
  rules: RuleRow[];
}) {
  return (
    <>
      <section className="admin-card">
        <h2>Room nightly rates</h2>
        <div className="admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Standard</th>
                <th>Promo</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <AdminClickableRow key={r.id} href={`/admin/rooms/${r.id}`}>
                  <td>{r.name}</td>
                  <td>{formatMoney(r.pricePerNight)}</td>
                  <td>
                    {r.promotionalPrice != null
                      ? formatMoney(r.promotionalPrice)
                      : "—"}
                  </td>
                  <td>
                    <AdminRowActions
                      label={`Actions for ${r.name}`}
                      actions={[
                        { label: "Edit", href: `/admin/rooms/${r.id}` },
                      ]}
                    />
                  </td>
                </AdminClickableRow>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-mobile-cards">
          {rooms.map((r) => (
            <AdminMobileCard
              key={r.id}
              title={r.name}
              href={`/admin/rooms/${r.id}`}
              actions={[{ label: "Edit", href: `/admin/rooms/${r.id}` }]}
            >
              <AdminMobileMeta
                items={[
                  {
                    label: "Standard",
                    value: formatMoney(r.pricePerNight),
                  },
                  {
                    label: "Promo",
                    value:
                      r.promotionalPrice != null
                        ? formatMoney(r.promotionalPrice)
                        : "—",
                  },
                ]}
              />
            </AdminMobileCard>
          ))}
        </div>
      </section>
      <section className="admin-card">
        <h2>Pricing rules</h2>
        <div className="admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Room</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={5}>No pricing rules yet.</td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.name}</td>
                    <td>{rule.roomName || "All"}</td>
                    <td>{rule.ruleType}</td>
                    <td>
                      {rule.isPercentage
                        ? `${rule.amount}%`
                        : formatMoney(rule.amount)}
                    </td>
                    <td>{rule.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-mobile-cards">
          {rules.length === 0 ? (
            <p className="admin-muted">No pricing rules yet.</p>
          ) : (
            rules.map((rule) => (
              <AdminMobileCard
                key={rule.id}
                title={rule.name}
                subtitle={rule.roomName || "All rooms"}
              >
                <AdminMobileMeta
                  items={[
                    { label: "Type", value: rule.ruleType },
                    {
                      label: "Amount",
                      value: rule.isPercentage
                        ? `${rule.amount}%`
                        : formatMoney(rule.amount),
                    },
                    {
                      label: "Active",
                      value: rule.isActive ? "Yes" : "No",
                    },
                  ]}
                />
              </AdminMobileCard>
            ))
          )}
        </div>
      </section>
    </>
  );
}

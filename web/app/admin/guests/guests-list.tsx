"use client";

import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";

type GuestRow = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
};

export function GuestsList({ guests }: { guests: GuestRow[] }) {
  return (
    <>
      <div className="admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Country</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={5}>No guests found.</td>
              </tr>
            ) : (
              guests.map((g) => {
                const href = `/admin/bookings?q=${encodeURIComponent(g.email)}`;
                return (
                  <AdminClickableRow key={`${g.email}-${g.phone}`} href={href}>
                    <td>
                      {g.firstName} {g.lastName}
                    </td>
                    <td>{g.email}</td>
                    <td>{g.phone}</td>
                    <td>{g.country || "—"}</td>
                    <td>
                      <AdminRowActions
                        label={`Actions for ${g.firstName} ${g.lastName}`}
                        actions={[{ label: "View bookings", href }]}
                      />
                    </td>
                  </AdminClickableRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {guests.length === 0 ? (
          <p className="admin-muted">No guests found.</p>
        ) : (
          guests.map((g) => {
            const href = `/admin/bookings?q=${encodeURIComponent(g.email)}`;
            return (
              <AdminMobileCard
                key={`${g.email}-${g.phone}`}
                title={`${g.firstName} ${g.lastName}`}
                subtitle={g.email}
                href={href}
                actions={[{ label: "View bookings", href }]}
              >
                <AdminMobileMeta
                  items={[
                    { label: "Phone", value: g.phone || "—" },
                    { label: "Country", value: g.country || "—" },
                  ]}
                />
              </AdminMobileCard>
            );
          })
        )}
      </div>
    </>
  );
}

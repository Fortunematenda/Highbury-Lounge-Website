"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatMoney } from "@/lib/format";

type PackageRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  capacity: number;
  basePrice: number | null;
  imageUrl: string | null;
  featuresJson: string | null;
  isActive: boolean;
  displayOrder: number;
};

export function PackagesManager({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete(pkg: PackageRow) {
    if (!window.confirm(`Delete “${pkg.name}”? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="admin-quick-actions" style={{ marginBottom: 16 }}>
        <Link className="admin-btn" href="/admin/packages/new">
          Add package
        </Link>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Capacity</th>
                <th>Base price</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No packages yet. Add one to show venues on the website.
                  </td>
                </tr>
              ) : (
                packages.map((r) => (
                  <AdminClickableRow
                    key={r.id}
                    href={`/admin/packages/${r.id}`}
                  >
                    <td>
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt=""
                          style={{
                            width: 56,
                            height: 40,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{r.name}</td>
                    <td>{r.capacity}</td>
                    <td>
                      {r.basePrice != null ? formatMoney(r.basePrice) : "—"}
                    </td>
                    <td>{r.isActive ? "Yes" : "No"}</td>
                    <td>
                      <AdminRowActions
                        label={`Actions for ${r.name}`}
                        actions={[
                          {
                            label: "Edit",
                            href: `/admin/packages/${r.id}`,
                          },
                          {
                            label: "Delete",
                            danger: true,
                            disabled: busy,
                            onClick: () => void onDelete(r),
                          },
                        ]}
                      />
                    </td>
                  </AdminClickableRow>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {packages.length === 0 ? (
            <p className="admin-muted">
              No packages yet. Add one to show venues on the website.
            </p>
          ) : (
            packages.map((r) => (
              <AdminMobileCard
                key={r.id}
                title={r.name}
                href={`/admin/packages/${r.id}`}
                actions={[
                  { label: "Edit", href: `/admin/packages/${r.id}` },
                  {
                    label: "Delete",
                    danger: true,
                    disabled: busy,
                    onClick: () => void onDelete(r),
                  },
                ]}
              >
                <AdminMobileMeta
                  items={[
                    { label: "Capacity", value: String(r.capacity) },
                    {
                      label: "Price",
                      value:
                        r.basePrice != null
                          ? formatMoney(r.basePrice)
                          : "—",
                    },
                    {
                      label: "Status",
                      value: r.isActive ? "Active" : "Inactive",
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

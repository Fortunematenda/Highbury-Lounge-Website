import Link from "next/link";
import type { DetailBreadcrumb } from "./types";

export function DetailPageBreadcrumbs({
  items,
}: {
  items: DetailBreadcrumb[];
}) {
  if (!items.length) return null;
  return (
    <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last ? <span className="detail-breadcrumbs-sep" aria-hidden>/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { forwardRef } from "react";

/** Next.js Link wrapper that defaults prefetch to false.
 *  This keeps vinext from trying to use crypto.subtle on http:// origins.
 */
export const AdminLink = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof Link>
>(function AdminLink({ prefetch, ...props }, ref) {
  return <Link ref={ref} prefetch={prefetch ?? false} {...props} />;
});

export default AdminLink;

import type { Metadata } from "next";
import Link from "next/link";
import { FindTicketClient } from "./find-ticket-client";
import "../../events.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find my ticket | Highbury Lounge",
  description: "Recover your Highbury Lounge event ticket order link.",
  robots: { index: false, follow: false },
};

export default function FindTicketPage() {
  return (
    <main className="event-ticket-page">
      <nav className="event-detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/events">Events</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Find my ticket</span>
      </nav>
      <FindTicketClient />
    </main>
  );
}

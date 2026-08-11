import type { Metadata } from "next";
import { FindBookingClient } from "./find-booking-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find my booking | Highbury Lounge",
  description: "Look up your Highbury Lounge room booking by reference.",
  robots: { index: false, follow: false },
};

export default function FindBookingPage() {
  return <FindBookingClient />;
}

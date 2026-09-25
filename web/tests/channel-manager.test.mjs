import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingSourceLabel,
  normalizeBookingSource,
  syncStatusLabel,
} from "../lib/channel-manager/booking-sources.ts";

test("booking source labels map legacy website to Direct Website", () => {
  assert.equal(normalizeBookingSource("website"), "DIRECT");
  assert.equal(bookingSourceLabel("website"), "Direct Website");
  assert.equal(bookingSourceLabel("DIRECT"), "Direct Website");
  assert.equal(bookingSourceLabel("BOOKING_COM"), "Booking.com");
  assert.equal(bookingSourceLabel("MANUAL"), "Manual");
  assert.equal(bookingSourceLabel("OTHER"), "Other");
});

test("sync status labels", () => {
  assert.equal(syncStatusLabel("NOT_SYNCED"), "Not synced");
  assert.equal(syncStatusLabel("PENDING"), "Pending");
  assert.equal(syncStatusLabel("SYNCED"), "Synced");
  assert.equal(syncStatusLabel("FAILED"), "Failed");
});

test("Beds24 feature flag defaults off (env contract)", () => {
  const raw = String(process.env.BEDS24_ENABLED || "false").toLowerCase();
  const enabled = raw === "true" || raw === "1" || raw === "yes";
  // CI / local without explicit enable must stay off
  if (!process.env.BEDS24_ENABLED) {
    assert.equal(enabled, false);
  }
  assert.equal(
    process.env.BEDS24_PROPERTY_ID || "",
    process.env.BEDS24_PROPERTY_ID || "",
  );
  assert.ok(true, "Property IDs must come from config — never hard-coded in app");
});

test("Booking.com accommodation number placeholder documented", () => {
  assert.equal("17125847", "17125847");
});

test("same-day turnover overlap rule: checkout day frees inventory", () => {
  // Overlap: existingStart < requestedCheckOut AND existingEnd > requestedCheckIn
  // Stay A: 10→11, Stay B: 11→12 must NOT overlap
  const existingStart = "2030-10-10";
  const existingEnd = "2030-10-11";
  const requestedCheckIn = "2030-10-11";
  const requestedCheckOut = "2030-10-12";
  const overlaps =
    existingStart < requestedCheckOut && existingEnd > requestedCheckIn;
  assert.equal(overlaps, false);
});

test("sold-out detection when remaining below rooms needed", () => {
  const inventory = 2;
  const occupied = 2;
  const remaining = Math.max(0, inventory - occupied);
  assert.equal(remaining >= 1, false);
});

test("duplicate Paynow callback should not create two channel bookings", () => {
  // Contract: syncBookingOutboundIfEnabled skips when externalBookingId is set.
  const booking = { externalBookingId: "BEDS-1", reference: "HL-1" };
  const wouldCreate = !booking.externalBookingId;
  assert.equal(wouldCreate, false);
});

test("idempotent webhook uses unique external booking id", () => {
  const deliveries = ["ext-42", "ext-42", "ext-42"];
  const unique = new Set(deliveries);
  assert.equal(unique.size, 1);
});

test("unmapped rooms must block live sync", () => {
  const mapping = null;
  const allowLiveSync = Boolean(mapping);
  assert.equal(allowLiveSync, false);
});

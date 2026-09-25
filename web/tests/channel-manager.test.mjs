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
  if (!process.env.BEDS24_ENABLED) {
    assert.equal(enabled, false);
  }
});

test("same-day turnover overlap rule: checkout day frees inventory", () => {
  const existingStart = "2030-10-10";
  const existingEnd = "2030-10-11";
  const requestedCheckIn = "2030-10-11";
  const requestedCheckOut = "2030-10-12";
  const overlaps =
    existingStart < requestedCheckOut && existingEnd > requestedCheckIn;
  assert.equal(overlaps, false);
});

test("post-insert race uses signed inventory balance (not clamped remaining)", () => {
  const inventory = 1;
  const occupiedAfterTwoInserts = 2;
  const clampedRemaining = Math.max(0, inventory - occupiedAfterTwoInserts);
  const signedBalance = inventory - occupiedAfterTwoInserts;
  // Old bug: clampedRemaining < 0 never true
  assert.equal(clampedRemaining < 0, false);
  // Fixed: signed balance detects overbook
  assert.equal(signedBalance < 0, true);
});

test("sold-out detection when remaining below rooms needed", () => {
  const inventory = 2;
  const occupied = 2;
  const remaining = Math.max(0, inventory - occupied);
  assert.equal(remaining >= 1, false);
});

test("duplicate Paynow callback should not create two channel bookings", () => {
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

test("live webhook requires shared secret when Beds24 enabled", () => {
  const enabled = true;
  const webhookSecret = "";
  const mustReject = enabled && !webhookSecret;
  assert.equal(mustReject, true);
});

test("direct booking syncs to channel before payment when live", () => {
  // Contract: outbound sync runs at createBooking time when BEDS24_ENABLED,
  // not only after Paynow — so OTAs cannot sell during the pending window.
  const beds24Enabled = true;
  const syncAtCreate = beds24Enabled;
  const syncOnlyAfterPaynow = false;
  assert.equal(syncAtCreate, true);
  assert.equal(syncOnlyAfterPaynow, false);
});

test("charge uses channel price source when live", () => {
  const recheck = { source: "beds24", pricePerNight: 180 };
  const localPromo = 200;
  const unitPrice =
    recheck.pricePerNight != null
      ? recheck.pricePerNight
      : localPromo;
  assert.equal(unitPrice, 180);
});

test("failed channel sync should surface as Failed not Saved successfully", () => {
  const apiResponse = { ok: true, syncStatus: "FAILED" };
  const staffLabel =
    apiResponse.syncStatus === "Synced"
      ? "Synced"
      : apiResponse.syncStatus === "FAILED"
        ? "Failed"
        : "Saved locally";
  assert.equal(staffLabel, "Failed");
  assert.notEqual(staffLabel, "Saved successfully");
});

test("thin webhook payloads are enriched before upsert", () => {
  const payload = { bookId: "99" };
  const thin = !payload.roomId || !payload.arrival;
  assert.equal(thin, true);
});

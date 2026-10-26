import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canChangeBooking, overlaps } from "../../../src/shared/utils/bookingRules";
import type { Booking } from "../../../src/shared/types/index";

const booking: Booking = {
  id: "booking-1",
  userId: "user-1",
  roomId: "room-1",
  date: "2026-10-27",
  start: "09:00",
  end: "10:00",
  attendees: 10,
  purpose: "ประชุมกลุ่ม",
  equipment: [],
  note: "",
  status: "PENDING",
  createdAt: "2026-10-26T07:00:00+07:00",
};

describe("schedule interval overlap", () => {
  it.each([
    ["09:00", "10:00", true],
    ["08:00", "12:00", true],
    ["09:30", "10:30", true],
    ["08:00", "09:00", false],
    ["10:00", "11:00", false],
    ["11:00", "12:00", false],
  ] as const)("checks %s–%s against 09:00–10:00", (start, end, expected) => {
    expect(overlaps(start, end, "09:00", "10:00")).toBe(expected);
  });
});

describe("booking history change eligibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T08:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it.each(["PENDING", "APPROVED"] as const)("allows future %s bookings", (status) => {
    expect(canChangeBooking({ ...booking, status })).toBe(true);
  });
  it.each(["IN_USE", "REJECTED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const)(
    "disallows %s even when the start is in the future",
    (status) => expect(canChangeBooking({ ...booking, status })).toBe(false),
  );
  it.each(["PENDING", "APPROVED"] as const)("disallows %s at or after the start", (status) => {
    vi.setSystemTime(new Date("2026-10-27T09:00:00"));
    expect(canChangeBooking({ ...booking, status })).toBe(false);
    vi.setSystemTime(new Date("2026-10-27T09:01:00"));
    expect(canChangeBooking({ ...booking, status })).toBe(false);
  });
});

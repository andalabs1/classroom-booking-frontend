import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { availabilityError, overlaps } from "./bookingRules";
import type { Booking, BookingDraft, BookingStatus, Room } from "../types";
const now = dayjs("2026-09-14T07:00");
const room: Room = {
  id: "r1",
  code: "A201",
  name: "ห้องเรียน",
  building: "A",
  floor: 2,
  capacity: 40,
  description: "",
  equipment: [],
  status: "ACTIVE",
  image: "",
  category: "ห้องเรียน",
};
const draft: BookingDraft = {
  roomId: "r1",
  date: "2026-09-15",
  start: "09:00",
  end: "10:00",
  attendees: 10,
  purpose: "ประชุมกลุ่ม",
  equipment: [],
  note: "",
};
const existing = (status: BookingStatus): Booking => ({
  ...draft,
  id: "b1",
  userId: "u1",
  status,
  createdAt: "2026-09-14",
});
describe("booking availability", () => {
  it("allows an available active room", () =>
    expect(availabilityError(draft, room, [], now)).toBeUndefined());
  it.each(["PENDING", "APPROVED"] as const)(
    "blocks overlap with %s",
    (status) =>
      expect(availabilityError(draft, room, [existing(status)], now)).toContain(
        "ผู้ใช้งานแล้ว",
      ),
  );
  it.each(["CANCELLED", "REJECTED", "COMPLETED"] as const)(
    "does not block %s",
    (status) =>
      expect(
        availabilityError(draft, room, [existing(status)], now),
      ).toBeUndefined(),
  );
  it("permits adjacent bookings", () =>
    expect(
      availabilityError(
        { ...draft, start: "10:00", end: "11:00" },
        room,
        [existing("APPROVED")],
        now,
      ),
    ).toBeUndefined());
  it("ignores the booking being edited", () =>
    expect(
      availabilityError(
        { ...draft, editingId: "b1" },
        room,
        [existing("PENDING")],
        now,
      ),
    ).toBeUndefined());
  it("does not confuse another room or date", () =>
    expect(
      availabilityError(
        draft,
        room,
        [
          { ...existing("PENDING"), roomId: "r2" },
          { ...existing("APPROVED"), date: "2026-09-16" },
        ],
        now,
      ),
    ).toBeUndefined());
  it("rejects capacity overflow", () =>
    expect(
      availabilityError({ ...draft, attendees: 41 }, room, [], now),
    ).toContain("40"));
  it("rejects zero attendees", () =>
    expect(
      availabilityError({ ...draft, attendees: 0 }, room, [], now),
    ).toBeDefined());
  it.each(["INACTIVE", "MAINTENANCE"] as const)("rejects %s room", (status) =>
    expect(availabilityError(draft, { ...room, status }, [], now)).toContain(
      "ไม่พร้อม",
    ),
  );
  it("rejects past dates", () =>
    expect(
      availabilityError({ ...draft, date: "2026-09-13" }, room, [], now),
    ).toContain("อนาคต"));
  it("rejects elapsed time today", () =>
    expect(
      availabilityError(
        { ...draft, date: "2026-09-14" },
        room,
        [],
        dayjs("2026-09-14T09:30"),
      ),
    ).toContain("อนาคต"));
  it("rejects reversed and zero duration", () => {
    expect(
      availabilityError({ ...draft, end: "08:00" }, room, [], now),
    ).toContain("เริ่มต้น");
    expect(
      availabilityError({ ...draft, end: "09:00" }, room, [], now),
    ).toContain("เริ่มต้น");
  });
  it("rejects outside opening hours", () =>
    expect(
      availabilityError({ ...draft, end: "21:00" }, room, [], now),
    ).toContain("08:00"));
  it("detects containment and partial overlap", () => {
    expect(overlaps("08:00", "12:00", "09:00", "10:00")).toBe(true);
    expect(overlaps("09:30", "10:30", "09:00", "10:00")).toBe(true);
    expect(overlaps("08:00", "09:00", "09:00", "10:00")).toBe(false);
  });
});

describe("malformed booking inputs", () => {
  it.each(["not-a-date", "2026-02-31"])("rejects invalid date %s", (date) =>
    expect(availabilityError({ ...draft, date }, room, [], now)).toContain(
      "ไม่ถูกต้อง",
    ),
  );
  it("rejects invalid times", () =>
    expect(
      availabilityError({ ...draft, start: "25:00" }, room, [], now),
    ).toContain("ไม่ถูกต้อง"));
  it("rejects fractional attendees", () =>
    expect(
      availabilityError({ ...draft, attendees: 1.5 }, room, [], now),
    ).toContain("จำนวนเต็ม"));
});

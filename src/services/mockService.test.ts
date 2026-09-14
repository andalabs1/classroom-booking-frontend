import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import { mockService, readDatabase } from "./mockService";
import type { BookingDraft } from "../types";
const storage = new Map<string, string>();
const draft: BookingDraft = {
  roomId: "room-1",
  date: dayjs().add(30, "day").format("YYYY-MM-DD"),
  start: "09:00",
  end: "10:00",
  attendees: 5,
  purpose: "ประชุมโครงงาน",
  equipment: ["Projector"],
  note: "",
};
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("navigator", {});
});
describe("mock booking workflows", () => {
  it("seeds required sample records", () => {
    const db = readDatabase();
    expect(db.rooms).toHaveLength(10);
    expect(db.users).toHaveLength(20);
    expect(db.bookings.length).toBeGreaterThanOrEqual(30);
  });
  it("authenticates demo accounts without exposing the password", async () => {
    expect(
      await mockService.login("student@university.ac.th", "Demo1234!"),
    ).not.toHaveProperty("password");
    await expect(mockService.login("admin", "wrong")).rejects.toThrow();
  });
  it("rechecks availability between review and confirmation", async () => {
    await mockService.check(draft);
    await mockService.book(draft, "65010001");
    await expect(mockService.book(draft, "65010003")).rejects.toThrow(
      "ผู้ใช้งานแล้ว",
    );
  });
  it("creates, approves, and cancels with persisted statuses", async () => {
    const b = await mockService.book(draft, "65010001");
    expect(b.status).toBe("PENDING");
    await mockService.status(b.id, "APPROVED", "admin");
    expect(readDatabase().bookings.find((v) => v.id === b.id)?.status).toBe(
      "APPROVED",
    );
    await mockService.status(b.id, "CANCELLED", "65010001");
    await expect(mockService.check(draft)).resolves.toBeUndefined();
  });
  it("requires a rejection reason and releases rejected time", async () => {
    const b = await mockService.book(draft, "65010001");
    await expect(
      mockService.status(b.id, "REJECTED", "admin", "  "),
    ).rejects.toThrow("เหตุผล");
    await mockService.status(b.id, "REJECTED", "admin", "ใช้สำหรับสอบ");
    await expect(mockService.check(draft)).resolves.toBeUndefined();
  });
  it("prevents user approval and cancellation of another user booking", async () => {
    const b = await mockService.book(draft, "65010001");
    await expect(
      mockService.status(b.id, "APPROVED", "65010001"),
    ).rejects.toThrow("สิทธิ์");
    await expect(
      mockService.status(b.id, "CANCELLED", "65010003"),
    ).rejects.toThrow("สิทธิ์");
  });
  it("edits a pending reservation without creating duplicates", async () => {
    const b = await mockService.book(draft, "65010001");
    const edited = await mockService.book(
      { ...draft, start: "10:00", end: "11:00", editingId: b.id },
      "65010001",
    );
    expect(edited.id).toBe(b.id);
    expect(readDatabase().bookings.filter((v) => v.id === b.id)).toHaveLength(
      1,
    );
  });
  it("refuses to edit approved reservations", async () => {
    const b = await mockService.book(draft, "65010001");
    await mockService.status(b.id, "APPROVED", "admin");
    await expect(
      mockService.book({ ...draft, editingId: b.id }, "65010001"),
    ).rejects.toThrow("แก้ไข");
  });
  it("rejects suspended users and protects admin self-access", async () => {
    const db = readDatabase();
    const student = db.users[0];
    await mockService.saveUser({ ...student, status: "SUSPENDED" }, "admin");
    await expect(mockService.book(draft, student.id)).rejects.toThrow("สิทธิ์");
    await expect(
      mockService.login(student.email, "Demo1234!"),
    ).rejects.toThrow();
    await expect(
      mockService.saveUser({ ...db.users[1], role: "USER" }, "admin"),
    ).rejects.toThrow("ตนเอง");
  });
  it("registers new users and rejects duplicate identifiers", async () => {
    const user = {
      ...readDatabase().users[0],
      id: "new-user",
      email: "new@university.ac.th",
    };
    await mockService.register(user);
    await expect(
      mockService.login(user.email, "Demo1234!"),
    ).resolves.toMatchObject({ id: "new-user" });
    await expect(mockService.register(user)).rejects.toThrow("มีในระบบ");
  });
});

describe("booking notifications", () => {
  it("notifies the owner and active admins about a new booking", async () => {
    const b = await mockService.book(draft, "65010001");
    expect(await mockService.notifications("65010001")).toContainEqual(
      expect.objectContaining({
        bookingId: b.id,
        readAt: null,
        title: "รับคำขอจองห้องเรียนแล้ว",
      }),
    );
    expect(await mockService.notifications("admin")).toContainEqual(
      expect.objectContaining({
        bookingId: b.id,
        title: "มีคำขอจองใหม่รออนุมัติ",
      }),
    );
    expect(await mockService.notifications("65010003")).toHaveLength(0);
  });
  it("persists read state without marking another recipient's item", async () => {
    await mockService.book(draft, "65010001");
    const [student] = await mockService.notifications("65010001");
    await expect(
      mockService.markNotificationsRead("admin", student.id),
    ).rejects.toThrow("สิทธิ์");
    await mockService.markNotificationsRead("65010001", student.id);
    expect(
      (await mockService.notifications("65010001"))[0].readAt,
    ).toBeTruthy();
    expect((await mockService.notifications("admin"))[0].readAt).toBeNull();
  });
  it("notifies on approval, editing, and cancellation", async () => {
    const b = await mockService.book(draft, "65010001");
    await mockService.book(
      { ...draft, editingId: b.id, purpose: "แก้ไขวัตถุประสงค์" },
      "65010001",
    );
    expect(
      (await mockService.notifications("admin")).map((n) => n.title),
    ).toContain("มีการแก้ไขคำขอจอง");
    await mockService.status(b.id, "APPROVED", "admin");
    expect(
      (await mockService.notifications("65010001")).map((n) => n.title),
    ).toContain("การจองอนุมัติแล้ว");
    await mockService.status(b.id, "CANCELLED", "65010001");
    expect(
      (await mockService.notifications("admin")).map((n) => n.title),
    ).toContain("ผู้จองยกเลิกการจองแล้ว");
    await mockService.markNotificationsRead("65010001");
    expect(
      (await mockService.notifications("65010001")).every((n) => n.readAt),
    ).toBe(true);
    expect(
      (await mockService.notifications("admin")).find(
        (n) => n.bookingId === b.id && n.title.includes("ยกเลิก"),
      )?.readAt,
    ).toBeNull();
  });
  it("includes rejection reasons and does not notify for failed changes", async () => {
    const b = await mockService.book(draft, "65010001");
    const countAfterBooking = (await mockService.notifications("65010001"))
      .length;
    await expect(
      mockService.status(b.id, "REJECTED", "admin", ""),
    ).rejects.toThrow();
    expect(await mockService.notifications("65010001")).toHaveLength(
      countAfterBooking,
    );
    await mockService.status(b.id, "REJECTED", "admin", "ห้องใช้สำหรับสอบ");
    expect(
      (await mockService.notifications("65010001")).some((n) =>
        n.message.includes("ห้องใช้สำหรับสอบ"),
      ),
    ).toBe(true);
    await expect(mockService.book(draft, "missing-user")).rejects.toThrow();
    expect(await mockService.notifications("65010001")).toHaveLength(
      countAfterBooking + 1,
    );
  });
  it("loads older saved databases without losing bookings", () => {
    const db = readDatabase();
    const { notifications, ...legacy } = db;
    void notifications;
    storage.set("classroom-database-v1", JSON.stringify(legacy));
    expect(readDatabase().notifications).toHaveLength(6);
    expect(readDatabase().bookings).toHaveLength(db.bookings.length);
  });
});

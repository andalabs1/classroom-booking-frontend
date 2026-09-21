import { addBookingNotifications } from "./bookingNotifications";
import { migrateRoomImage } from "../mocks/roomImages";
import { mergeNotificationSeed } from "../mocks/notificationSeed";
import { createSeed } from "../mocks/seed";
import type {
  BookingDraft,
  BookingStatus,
  Database,
  Room,
  User,
} from "../types";
import { availabilityError, canChangeBooking } from "../utils/bookingRules";
const KEY = "classroom-database-v1";
export function readDatabase(): Database {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const db = JSON.parse(raw) as Database;
    db.notifications ??= [];
    db.notifications = db.notifications.map((item) => ({
      ...item,
      kind:
        item.kind ??
        (item.title.includes("อนุมัติแล้ว")
          ? "APPROVED"
          : item.title.includes("ปฏิเสธ") || item.title.includes("ไม่อนุมัติ")
            ? "REJECTED"
            : item.title.includes("ยกเลิก")
              ? "CANCELLED"
              : "BOOKING"),
    }));
    db.rooms = db.rooms.map((room) => ({
      ...room,
      image: migrateRoomImage(room.image),
    }));
    return mergeNotificationSeed(db);
  }
  const db = createSeed();
  save(db);
  return db;
}
function save(db: Database) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
function actor(db: Database, userId: string, admin = false) {
  const user = db.users.find((u) => u.id === userId);
  if (!user || user.status !== "ACTIVE" || (admin && user.role !== "ADMIN"))
    throw new Error("ไม่มีสิทธิ์ดำเนินการ");
  return user;
}
export const mockService = {
  async database() {
    return readDatabase();
  },
  async notifications(userId: string) {
    const db = readDatabase();
    actor(db, userId);
    return db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markNotificationsRead(userId: string, id?: string) {
    const db = readDatabase();
    actor(db, userId);
    if (id && !db.notifications.some((n) => n.id === id && n.userId === userId))
      throw new Error("ไม่พบการแจ้งเตือนหรือไม่มีสิทธิ์เข้าถึง");
    for (const item of db.notifications) {
      if (item.userId === userId && (!id || item.id === id) && !item.readAt)
        item.readAt = new Date().toISOString();
    }
    save(db);
  },
  async login(username: string, password: string) {
    const user = readDatabase().users.find(
      (u) =>
        (u.email === username || u.id === username) && u.password === password,
    );
    if (!user || user.status !== "ACTIVE")
      throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ");
    const { password: _, ...safe } = user;
    void _;
    return safe;
  },
  async register(user: User) {
    const db = readDatabase();
    if (db.users.some((u) => u.id === user.id || u.email === user.email))
      throw new Error("อีเมลหรือรหัสผู้ใช้งานนี้มีในระบบแล้ว");
    db.users.push(user);
    save(db);
  },
  async check(draft: BookingDraft) {
    const db = readDatabase();
    const error = availabilityError(
      draft,
      db.rooms.find((r) => r.id === draft.roomId),
      db.bookings,
    );
    if (error) throw new Error(error);
  },
  async book(draft: BookingDraft, userId: string) {
    // Synchronous read / validate / write inside a cross-tab lock for the local mock.
    const commit = () => {
      const db = readDatabase();
      actor(db, userId);
      const error = availabilityError(
        draft,
        db.rooms.find((r) => r.id === draft.roomId),
        db.bookings,
      );
      if (error) throw new Error(error);
      const existing = draft.editingId
        ? db.bookings.find((b) => b.id === draft.editingId)
        : undefined;
      if (
        draft.editingId &&
        (!existing ||
          existing.userId !== userId ||
          existing.status !== "PENDING" ||
          !canChangeBooking(existing))
      )
        throw new Error("ไม่สามารถแก้ไขรายการนี้ได้");
      const booking = {
        ...draft,
        id:
          existing?.id ??
          `BK-${draft.date.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        userId,
        status: "PENDING" as const,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (existing)
        db.bookings = db.bookings.map((b) =>
          b.id === existing.id ? booking : b,
        );
      else db.bookings.push(booking);
      addBookingNotifications(db, booking, existing ? "UPDATED" : "CREATED");
      save(db);
      return booking;
    };
    return navigator.locks ? navigator.locks.request(KEY, commit) : commit();
  },
  async status(
    id: string,
    status: BookingStatus,
    userId: string,
    reason?: string,
  ) {
    const db = readDatabase();
    const user = actor(db, userId);
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("ไม่พบการจอง");
    if (
      user.role !== "ADMIN" &&
      (booking.userId !== user.id || status !== "CANCELLED")
    )
      throw new Error("ไม่มีสิทธิ์ดำเนินการ");
    if (status === "CANCELLED" && !canChangeBooking(booking))
      throw new Error("ไม่สามารถยกเลิกได้");
    if (
      ["APPROVED", "REJECTED"].includes(status) &&
      booking.status !== "PENDING"
    )
      throw new Error("สถานะการจองเปลี่ยนแปลงแล้ว");
    if (status === "REJECTED" && !reason?.trim())
      throw new Error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
    if (status === "APPROVED") {
      const error = availabilityError(
        { ...booking, editingId: booking.id },
        db.rooms.find((r) => r.id === booking.roomId),
        db.bookings,
      );
      if (error) throw new Error(error);
    }
    if (booking.status === status) return;
    booking.status = status;
    booking.reason = reason;
    addBookingNotifications(db, booking, "STATUS");
    save(db);
  },
  async saveRoom(room: Room, userId: string) {
    const db = readDatabase();
    actor(db, userId, true);
    if (db.rooms.some((r) => r.code === room.code && r.id !== room.id))
      throw new Error("รหัสห้องซ้ำ");
    const index = db.rooms.findIndex((r) => r.id === room.id);
    if (index < 0) db.rooms.push(room);
    else db.rooms[index] = room;
    save(db);
  },
  async saveUser(user: User, userId: string) {
    const db = readDatabase();
    actor(db, userId, true);
    if (
      user.id === userId &&
      (user.role !== "ADMIN" || user.status !== "ACTIVE")
    )
      throw new Error("ไม่สามารถระงับหรือลดสิทธิ์ตนเองได้");
    const old = db.users.find((u) => u.id === user.id);
    if (!old) throw new Error("ไม่พบผู้ใช้งาน");
    if (db.users.some((u) => u.id !== user.id && u.email === user.email))
      throw new Error("อีเมลซ้ำ");
    db.users = db.users.map((u) =>
      u.id === user.id ? { ...old, ...user } : u,
    );
    save(db);
  },
};

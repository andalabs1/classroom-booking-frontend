import dayjs from "dayjs";
import type { BookingNotification, Database } from "../types";

export function createNotificationSeed(
  db: Pick<Database, "bookings" | "rooms">,
): BookingNotification[] {
  const bookingFor = (userId: string, status?: string) =>
    [...db.bookings]
      .filter(
        (booking) =>
          booking.userId === userId && (!status || booking.status === status),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? db.bookings[0];
  const details = (booking: Database["bookings"][number]) => {
    const room = db.rooms.find((item) => item.id === booking.roomId);
    return `${room?.code ?? booking.roomId} · ${booking.date} · ${booking.start}–${booking.end}`;
  };
  const make = (
    id: string,
    userId: string,
    booking: Database["bookings"][number],
    title: string,
    kind: BookingNotification["kind"],
    hoursAgo: number,
    read: boolean,
    suffix = "",
  ): BookingNotification => ({
    id,
    userId,
    bookingId: booking.id,
    title,
    kind,
    message: `${details(booking)}${suffix}`,
    createdAt: dayjs().subtract(hoursAgo, "hour").toISOString(),
    readAt: read
      ? dayjs()
          .subtract(Math.max(0, hoursAgo - 1), "hour")
          .toISOString()
      : null,
  });

  const studentApproved = bookingFor("65010001", "APPROVED");
  const studentPending = bookingFor("65010001", "PENDING");
  const adminPending =
    db.bookings.find((booking) => booking.status === "PENDING") ??
    db.bookings[1];
  const adminRejected =
    db.bookings.find((booking) => booking.status === "REJECTED") ??
    db.bookings[4];
  return [
    make(
      "mock-student-reminder",
      "65010001",
      studentApproved,
      "เตือนการจองที่กำลังจะถึง",
      "REMINDER",
      1,
      false,
      " · เริ่มใช้งานในอีก 1 ชั่วโมง",
    ),
    make(
      "mock-student-approved",
      "65010001",
      studentApproved,
      "การจองอนุมัติแล้ว",
      "APPROVED",
      5,
      false,
    ),
    make(
      "mock-student-received",
      "65010001",
      studentPending,
      "รับคำขอจองห้องเรียนแล้ว",
      "BOOKING",
      26,
      true,
    ),
    make(
      "mock-admin-new",
      "admin",
      adminPending,
      "มีคำขอจองใหม่รออนุมัติ",
      "BOOKING",
      2,
      false,
    ),
    make(
      "mock-admin-updated",
      "admin",
      adminPending,
      "ผู้จองแก้ไขรายละเอียดคำขอ",
      "BOOKING",
      8,
      false,
    ),
    make(
      "mock-admin-rejected",
      "admin",
      adminRejected,
      "บันทึกการปฏิเสธคำขอแล้ว",
      "REJECTED",
      30,
      true,
      " · เหตุผล: ห้องใช้สำหรับการสอบ",
    ),
  ];
}

export function mergeNotificationSeed(db: Database): Database {
  const existingIds = new Set(db.notifications.map((item) => item.id));
  db.notifications.push(
    ...createNotificationSeed(db).filter((item) => !existingIds.has(item.id)),
  );
  return db;
}

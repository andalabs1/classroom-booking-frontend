import type { Booking, Database } from "../types";
import { bookingLabels } from "../constants/bookingStatus";

export function addBookingNotifications(
  db: Database,
  booking: Booking,
  event: "CREATED" | "UPDATED" | "STATUS",
) {
  const room = db.rooms.find((r) => r.id === booking.roomId);
  const details = `${room?.code ?? booking.roomId} · ${booking.date} · ${booking.start}–${booking.end}`;
  const adminIds = db.users
    .filter(
      (u) =>
        u.role === "ADMIN" && u.status === "ACTIVE" && u.id !== booking.userId,
    )
    .map((u) => u.id);
  const title =
    event === "CREATED"
      ? "รับคำขอจองห้องเรียนแล้ว"
      : event === "UPDATED"
        ? "แก้ไขคำขอจองแล้ว"
        : `การจอง${bookingLabels[booking.status]}`;
  const kind =
    event !== "STATUS"
      ? "BOOKING"
      : booking.status === "APPROVED"
        ? "APPROVED"
        : booking.status === "REJECTED"
          ? "REJECTED"
          : "CANCELLED";
  const add = (userId: string, heading: string) =>
    db.notifications.push({
      id: crypto.randomUUID(),
      userId,
      bookingId: booking.id,
      title: heading,
      message: `${details}${booking.reason ? ` · เหตุผล: ${booking.reason}` : ""}`,
      createdAt: new Date().toISOString(),
      readAt: null,
      kind,
    });
  add(booking.userId, title);
  if (event !== "STATUS" || booking.status === "CANCELLED") {
    for (const id of adminIds)
      add(
        id,
        event === "CREATED"
          ? "มีคำขอจองใหม่รออนุมัติ"
          : event === "UPDATED"
            ? "มีการแก้ไขคำขอจอง"
            : "ผู้จองยกเลิกการจองแล้ว",
      );
  }
}

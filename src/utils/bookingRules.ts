import dayjs from "dayjs";
import type { Booking, BookingDraft, Room } from "../types";
export const overlaps = (
  start: string,
  end: string,
  existingStart: string,
  existingEnd: string,
) => start < existingEnd && end > existingStart;
export function availabilityError(
  draft: BookingDraft,
  room: Room | undefined,
  bookings: Booking[],
  now = dayjs(),
): string | undefined {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    !dayjs(draft.date).isValid() ||
    dayjs(draft.date).format("YYYY-MM-DD") !== draft.date ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.end)
  )
    return "วันหรือเวลาไม่ถูกต้อง";
  if (!Number.isInteger(draft.attendees))
    return "จำนวนผู้ใช้งานต้องเป็นจำนวนเต็ม";
  if (!room || room.status !== "ACTIVE") return "ห้องนี้ไม่พร้อมใช้งาน";
  if (draft.start >= draft.end) return "เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด";
  if (
    draft.date < now.format("YYYY-MM-DD") ||
    dayjs(`${draft.date}T${draft.start}`).isBefore(now)
  )
    return "กรุณาเลือกวันและเวลาในอนาคต";
  if (draft.start < "08:00" || draft.end > "20:00")
    return "จองได้ระหว่าง 08:00–20:00 น.";
  if (draft.attendees < 1 || draft.attendees > room.capacity)
    return `จำนวนผู้ใช้งานต้องอยู่ระหว่าง 1–${room.capacity} คน`;
  if (
    bookings.some(
      (b) =>
        b.id !== draft.editingId &&
        b.roomId === draft.roomId &&
        b.date === draft.date &&
        ["PENDING", "APPROVED"].includes(b.status) &&
        overlaps(draft.start, draft.end, b.start, b.end),
    )
  )
    return "ไม่สามารถจองได้ เนื่องจากช่วงเวลาดังกล่าวมีผู้ใช้งานแล้ว";
}
export const canChangeBooking = (booking: Booking) =>
  ["PENDING", "APPROVED"].includes(booking.status) &&
  dayjs(`${booking.date}T${booking.start}`).isAfter(dayjs());

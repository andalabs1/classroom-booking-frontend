import type { BookingStatus } from "../types";
import type { TFunction } from "i18next";
export const bookingLabels: Record<BookingStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  IN_USE: "กำลังใช้งาน",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
  NO_SHOW: "ไม่เข้าใช้งาน",
};
const bookingLabelKeys: Record<BookingStatus, string> = {
  PENDING: "bookingPending",
  APPROVED: "bookingApproved",
  IN_USE: "bookingInUse",
  REJECTED: "bookingRejected",
  CANCELLED: "bookingCancelled",
  COMPLETED: "bookingCompleted",
  NO_SHOW: "bookingNoShow",
};
export const getBookingLabels = (t: TFunction): Record<BookingStatus, string> =>
  Object.fromEntries(
    Object.entries(bookingLabelKeys).map(([status, key]) => [status, t(key)]),
  ) as Record<BookingStatus, string>;
export const bookingColors: Record<BookingStatus, string> = {
  PENDING: "gold",
  APPROVED: "green",
  IN_USE: "blue",
  REJECTED: "red",
  CANCELLED: "default",
  COMPLETED: "purple",
  NO_SHOW: "orange",
};
export const equipmentOptions = [
  "Projector",
  "Whiteboard",
  "Wi-Fi",
  "Air Conditioner",
  "Computer",
  "Microphone",
  "TV",
  "HDMI",
];

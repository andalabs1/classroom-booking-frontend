import type { BookingStatus } from "../types";
export const bookingLabels: Record<BookingStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  IN_USE: "กำลังใช้งาน",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
  NO_SHOW: "ไม่เข้าใช้งาน",
};
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

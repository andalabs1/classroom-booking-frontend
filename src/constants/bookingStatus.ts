import type { BookingStatus } from "../types";
export const bookingLabels: Record<BookingStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  COMPLETED: "เสร็จสิ้น",
};
export const bookingColors: Record<BookingStatus, string> = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default",
  COMPLETED: "purple",
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

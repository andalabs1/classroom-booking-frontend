import type { BookingStatus } from "../types/index";
import type { TFunction } from "i18next";
const bookingLabelKeys: Record<BookingStatus, string> = {
  PENDING: "bookingPending",
  APPROVED: "bookingApproved",
  IN_USE: "bookingInUse",
  REJECTED: "bookingRejected",
  CANCELLED: "bookingCancelled",
  COMPLETED: "bookingCompleted",
  NO_SHOW: "bookingNoShow",
};
/**
 * สร้างชื่อแสดงผลของทุกสถานะจาก t ที่รับมา เพื่อให้เปลี่ยนตามภาษาปัจจุบัน
 */
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
export const equipmentLabelKeys: Record<string, string> = {
  Projector: "equipmentProjector",
  Whiteboard: "equipmentWhiteboard",
  "Wi-Fi": "equipmentWifi",
  "Air Conditioner": "equipmentAirConditioner",
  Computer: "equipmentComputer",
  Microphone: "equipmentMicrophone",
  TV: "equipmentTelevision",
  HDMI: "equipmentHdmi",
};
/**
 * แปลชื่ออุปกรณ์ที่รู้จัก และใช้ข้อความเดิมเป็น translation key เมื่อไม่มี mapping
 */
export const getEquipmentLabel = (t: TFunction, equipment: string) =>
  t(equipmentLabelKeys[equipment] ?? equipment);

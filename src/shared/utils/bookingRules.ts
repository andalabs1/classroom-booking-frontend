import dayjs from "dayjs";
import type { Booking } from "../types/index";
/**
 * ตรวจช่วงเวลารูปแบบ HH:mm แบบไม่รวมขอบปลาย จึงอนุญาตช่วงที่เริ่มตรงเวลาสิ้นสุดเดิม
 */
export const overlaps = (
  start: string,
  end: string,
  existingStart: string,
  existingEnd: string,
) => start < existingEnd && end > existingStart;
/**
 * ใช้กำหนดปุ่มแก้ไข/ยกเลิกเบื้องต้นเมื่อเป็น PENDING/APPROVED และยังไม่ถึงเวลาเริ่ม
 * backend ยังตรวจสิทธิ์ สถานะ และ cancellation cutoff เพิ่มเมื่อส่งคำขอจริง
 */
export const canChangeBooking = (booking: Booking) =>
  ["PENDING", "APPROVED"].includes(booking.status) &&
  dayjs(`${booking.date}T${booking.start}`).isAfter(dayjs());

import dayjs from "dayjs";
import type { Booking } from "../types/index";
export const overlaps = (
  start: string,
  end: string,
  existingStart: string,
  existingEnd: string,
) => start < existingEnd && end > existingStart;
export const canChangeBooking = (booking: Booking) =>
  ["PENDING", "APPROVED"].includes(booking.status) &&
  dayjs(`${booking.date}T${booking.start}`).isAfter(dayjs());

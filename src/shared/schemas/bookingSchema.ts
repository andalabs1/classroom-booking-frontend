import { z } from "zod";
type Translate = (key: string) => string;
export const createBookingSchema = (t: Translate) => z.object({
  roomId: z.string().min(1, t("bookingValidationRoom")),
  date: z.string().min(1, t("bookingValidationDate")),
  start: z.string().min(1, t("bookingValidationTime")),
  end: z.string().min(1, t("bookingValidationTime")),
  attendees: z.number().int().min(1, t("bookingValidationAttendees")),
  purpose: z.string().trim().min(5, t("bookingValidationPurpose")),
  equipment: z.array(z.string()),
  note: z.string(),
  editingId: z.string().optional(),
});
export const bookingSchema = createBookingSchema((key) => key);

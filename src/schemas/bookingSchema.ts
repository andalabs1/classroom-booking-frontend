import { z } from "zod";
export const bookingSchema = z.object({
  roomId: z.string().min(1, "กรุณาเลือกห้อง"),
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  start: z.string().min(1, "กรุณาเลือกเวลา"),
  end: z.string().min(1, "กรุณาเลือกเวลา"),
  attendees: z.number().int().min(1, "กรุณาระบุจำนวนผู้ใช้งาน"),
  purpose: z
    .string()
    .trim()
    .min(5, "กรุณาระบุวัตถุประสงค์อย่างน้อย 5 ตัวอักษร"),
  equipment: z.array(z.string()),
  note: z.string(),
  editingId: z.string().optional(),
});

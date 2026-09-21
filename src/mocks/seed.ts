import dayjs from "dayjs";
import type { Database, BookingStatus, Room } from "../types";
import { roomImages } from "./roomImages";
import { createNotificationSeed } from "./notificationSeed";
export function createSeed(): Database {
  const names = [
    "ธนกร",
    "ณัฐวดี",
    "กิตติพงษ์",
    "พิชญา",
    "ศุภชัย",
    "ปวีณา",
    "ธนวัฒน์",
    "ชลธิชา",
    "ภูริณัฐ",
    "นภัสสร",
    "อัครพล",
    "วรัญญา",
    "ภัทรพล",
    "สุชาดา",
    "ธีรภัทร",
    "จิราพร",
    "นนทกร",
    "พรนภา",
    "กฤติน",
    "อรพรรณ",
  ];
  const surnames = ["ใจดี", "วงศ์สวัสดิ์", "ศรีสุข", "พัฒนกุล", "แสงทอง"];
  const users = names.map((firstName, i) => ({
    id:
      i === 0
        ? "65010001"
        : i === 1
          ? "admin"
          : `650100${String(i + 1).padStart(2, "0")}`,
    firstName,
    lastName: surnames[i % 5],
    email:
      i === 0
        ? "student@university.ac.th"
        : i === 1
          ? "admin@university.ac.th"
          : `student${i}@university.ac.th`,
    phone: `08912345${String(i).padStart(2, "0")}`,
    role: i === 1 ? ("ADMIN" as const) : ("USER" as const),
    status: "ACTIVE" as const,
    registeredAt: dayjs()
      .subtract(90 + i, "day")
      .toISOString(),
    password: "Demo1234!",
  }));
  const roomNames = [
    "ห้องเรียนอัจฉริยะ",
    "ห้องเรียนบรรยาย",
    "ห้องปฏิบัติการคอมพิวเตอร์",
    "ห้องเรียนบรรยาย",
    "ห้องประชุมกลุ่มย่อย",
    "ห้องเรียนอัจฉริยะ",
    "ห้องปฏิบัติการภาษา",
    "ห้องสัมมนา",
    "ห้องเรียนบรรยาย",
    "ห้องประชุมใหญ่",
  ];
  const rooms: Room[] = roomNames.map((name, i) => ({
    id: `room-${i + 1}`,
    code: `${i < 6 ? "A" : "B"}${Math.floor(i / 3) + 2}0${(i % 3) + 1}`,
    name,
    building: i < 6 ? "อาคารเรียนรวม A" : "อาคารวิทยบริการ B",
    floor: Math.floor(i / 3) + 2,
    capacity: [40, 60, 35, 50, 12, 40, 30, 25, 80, 120][i],
    description:
      "พื้นที่การเรียนรู้ที่โปร่งสบาย พร้อมอุปกรณ์ครบครัน เหมาะสำหรับการเรียน การทำงานร่วมกัน และกิจกรรมนักศึกษา มีแสงธรรมชาติและเครื่องปรับอากาศ",
    equipment:
      i === 2
        ? ["Computer", "Projector", "Wi-Fi", "Air Conditioner", "Whiteboard"]
        : [
            "Projector",
            "Whiteboard",
            "Wi-Fi",
            "Air Conditioner",
            ...(i % 2 ? ["Microphone"] : ["HDMI"]),
          ],
    status: i === 5 ? "MAINTENANCE" : i === 9 ? "INACTIVE" : "ACTIVE",
    image: roomImages[i % roomImages.length],
    category:
      i === 2
        ? "ห้องปฏิบัติการ"
        : i === 4 || i === 7 || i === 9
          ? "ห้องประชุม"
          : "ห้องเรียน",
  }));
  const statuses: BookingStatus[] = [
    "APPROVED",
    "PENDING",
    "APPROVED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ];
  const bookings = Array.from({ length: 36 }, (_, i) => ({
    id: `BK-${dayjs().format("YYYYMMDD")}-${String(i + 1).padStart(4, "0")}`,
    roomId: rooms[i % 5].id,
    userId: users[i % 20].id,
    date: dayjs()
      .add(Math.floor(i / 5) - 3, "day")
      .format("YYYY-MM-DD"),
    start: `${String(9 + (i % 3) * 2).padStart(2, "0")}:00`,
    end: `${String(11 + (i % 3) * 2).padStart(2, "0")}:00`,
    attendees: 10,
    purpose: [
      "ทบทวนบทเรียนร่วมกับเพื่อน",
      "นำเสนอโครงงาน",
      "กิจกรรมกลุ่มวิชาออกแบบ",
    ][i % 3],
    equipment: ["Projector"],
    note: "",
    status: statuses[i % 6],
    createdAt: dayjs().subtract(i, "day").toISOString(),
  }));
  const database: Database = { users, rooms, bookings, notifications: [] };
  database.notifications = createNotificationSeed(database);
  return database;
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
void i18n.use(initReactI18next).init({
  lng: localStorage.getItem("classroom-language") || "th",
  fallbackLng: "th",
  interpolation: { escapeValue: false },
  resources: {
    th: {
      translation: {
        rooms: "ห้องเรียน",
        schedule: "ตารางการใช้ห้อง",
        booking: "จองห้องเรียน",
        history: "ประวัติการจอง",
        search: "ค้นหาชื่อห้อง หรือรหัสห้อง...",
        roomTitle: "ห้องเรียน",
        roomSubtitle: "ค้นหาพื้นที่ที่ใช่ สำหรับทุกการเรียนรู้ของคุณ",
        allRooms: "ห้องทั้งหมด",
        available: "พร้อมใช้งาน",
        maintenance: "ปิดปรับปรุง",
        book: "จองห้อง",
        details: "ดูรายละเอียด",
        logout: "ออกจากระบบ",
      },
    },
    en: {
      translation: {
        rooms: "Classrooms",
        schedule: "Room schedule",
        booking: "Book a room",
        history: "Booking history",
        search: "Search room name or code...",
        roomTitle: "Classrooms",
        roomSubtitle: "Find the right space for your next learning experience",
        allRooms: "All rooms",
        available: "Available",
        maintenance: "Maintenance",
        book: "Book room",
        details: "View details",
        logout: "Sign out",
      },
    },
  },
});
export { i18n };

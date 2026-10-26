import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import {
  classroomsApi,
  type ClassroomFilters,
  type ClassroomRange,
} from "../api/classrooms";
import { bookingsApi, type BookingFilters } from "../api/bookings";
import {
  notificationsApi,
  type NotificationFilters,
} from "../api/notifications";
import { usersApi } from "../api/users";
import { adminApi, type AdminFilters, type ReportFilters } from "../api/admin";
import type { AuthPortal } from "../stores/authStore";

/**
 * โหลดรายการห้องและผูก cache กับ filters เพื่อให้แต่ละชุดตัวกรองมีผลลัพธ์แยกกัน
 */
export function useClassrooms(filters: ClassroomFilters = {}) {
  return useQuery({
    queryKey: ["classrooms", filters],
    queryFn: () => classroomsApi.list(filters),
  });
}

/**
 * โหลดห้องตาม ID และปิด query จนกว่าจะมี ID เพื่อไม่ส่ง request ของค่าที่ยังไม่ถูกเลือก
 */
export function useClassroom(id: string | undefined) {
  return useQuery({
    queryKey: ["classrooms", id],
    queryFn: () => classroomsApi.get(id!),
    enabled: Boolean(id),
  });
}

/**
 * โหลดห้องว่างตาม range; เปิด query เฉพาะเมื่อมี classroomIds อย่างน้อยหนึ่งห้อง
 */
export function useClassroomsAvailability(range: ClassroomRange | undefined) {
  return useQuery({
    queryKey: ["classrooms", "availability", range],
    queryFn: () => classroomsApi.availability(range!),
    enabled: Boolean(range?.classroomIds?.length),
  });
}

/**
 * โหลดตารางตาม range และ ID ห้องที่เลือก; ไม่ส่ง request ขณะยังไม่มีห้อง
 */
export function useClassroomSchedule(range: ClassroomRange | undefined) {
  return useQuery({
    queryKey: ["classrooms", "schedule", range],
    queryFn: () => classroomsApi.schedule(range!),
    enabled: Boolean(range?.classroomIds?.length),
  });
}

/**
 * โหลดรายการจองผ่าน user client โดยใช้ filters เป็นส่วนหนึ่งของ query key
 */
export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => bookingsApi.list(filters),
  });
}

/**
 * โหลดรายละเอียด booking เมื่อมี ID และเก็บ cache รายรายการแยกจากรายการค้นหา
 */
export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => bookingsApi.get(id!),
    enabled: Boolean(id),
  });
}

/**
 * โหลดแจ้งเตือนและแยก cache ตาม portal/filters เพื่อให้ user กับ admin ไม่ใช้ผลลัพธ์ชุดเดียวกัน
 */
export function useNotifications(portal: AuthPortal, filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ["notifications", portal, filters],
    queryFn: () => notificationsApi.list(portal, filters),
  });
}

/**
 * โหลดจำนวนยังไม่อ่านของ portal โดยใช้ query key แยกจากรายการแจ้งเตือน
 */
export function useUnreadNotificationCount(portal: AuthPortal) {
  return useQuery({
    queryKey: ["notifications", portal, "unread-count"],
    queryFn: () => notificationsApi.unreadCount(portal),
  });
}

/**
 * โหลดโปรไฟล์ปัจจุบันของ user portal และใช้ cache ใต้กลุ่ม users/me
 */
export function useMyProfile() {
  return useQuery({ queryKey: ["users", "me"], queryFn: usersApi.me });
}

/**
 * โหลดประวัติของผู้ใช้ปัจจุบันสูงสุด 100 รายการสำหรับกรองและแบ่งหน้าในหน้าประวัติ
 */
export function useMyBookings() {
  return useQuery({
    queryKey: ["users", "me", "bookings"],
    queryFn: () => usersApi.myBookings({ limit: 100 }),
  });
}

/**
 * โหลดกติกาการจองจาก backend และถือข้อมูลว่ายังสดนานห้านาทีก่อน refetch ตามนโยบาย query
 */
export function useBusinessRules() {
  return useQuery({
    queryKey: ["config", "business-rules"],
    queryFn: usersApi.businessRules,
    staleTime: 5 * 60_000,
  });
}

/**
 * โหลดตัวเลข dashboard ผ่าน admin client และเก็บ cache ใต้กลุ่ม admin
 */
export function useAdminDashboard() {
  return useQuery({ queryKey: ["admin", "dashboard"], queryFn: adminApi.dashboardSummary });
}

/**
 * โหลดกราฟและสัดส่วนสถานะรวมสำหรับ dashboard; ข้อมูลไม่ขึ้นกับ report filters
 */
export function useAdminReportSummary() {
  return useQuery({ queryKey: ["admin", "reports", "summary"], queryFn: adminApi.reportsSummary });
}

/**
 * โหลดการจองที่สร้างล่าสุดแปดรายการสำหรับแสดงบน dashboard
 */
export function useAdminRecentBookings() {
  return useQuery({ queryKey: ["admin", "recent-bookings"], queryFn: () => adminApi.recentBookings(8) });
}

/**
 * โหลดห้องตาม filters สำหรับ admin โดยแยก cache ออกจาก public classrooms
 */
export function useAdminClassrooms(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "classrooms", filters], queryFn: () => adminApi.classrooms(filters) });
}

/**
 * โหลดรายละเอียดห้องและประวัติของ admin เมื่อมี ID
 */
export function useAdminClassroom(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "classrooms", id], queryFn: () => adminApi.classroom(id!), enabled: Boolean(id) });
}

/**
 * โหลดการจอง admin ตาม filters; live=true ให้ refetch ทุกสิบวินาทีขณะหน้าอยู่ foreground
 */
export function useAdminBookings(
  filters: AdminFilters = {},
  options: { live?: boolean } = {},
) {
  return useQuery({
    queryKey: ["admin", "bookings", filters],
    queryFn: () => adminApi.bookings(filters),
    refetchInterval: options.live ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * โหลดรายละเอียดการจองพร้อม audit history ของ admin เมื่อเลือก ID
 */
export function useAdminBooking(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "bookings", id], queryFn: () => adminApi.booking(id!), enabled: Boolean(id) });
}

/**
 * โหลดผู้ใช้ตาม filters ด้วย admin client และแยก cache ตามชุดตัวกรอง
 */
export function useAdminUsers(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "users", filters], queryFn: () => adminApi.users(filters) });
}

/**
 * โหลดโปรไฟล์และประวัติของผู้ใช้สำหรับ admin เมื่อมี ID
 */
export function useAdminUser(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "users", id], queryFn: () => adminApi.user(id!), enabled: Boolean(id) });
}

/**
 * โหลด summary/bookings/classrooms/users แบบขนานเป็นผล query เดียว
 * filters ใช้กับสามรายงานรายละเอียด ส่วน summary เป็นยอดรวมที่ไม่ได้กรอง
 */
export function useAdminReports(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ["admin", "reports", filters],
    queryFn: async () => {
      const [summary, bookings, classrooms, users] = await Promise.all([
        adminApi.reportsSummary(),
        adminApi.reportsBookings(filters),
        adminApi.reportsClassrooms(filters),
        adminApi.reportsUsers(filters),
      ]);
      return { summary, bookings, classrooms, users };
    },
  });
}

/**
 * โหลด audit logs ตาม filters และเก็บ cache ใต้กลุ่ม admin/audit-logs
 */
export function useAuditLogs(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "audit-logs", filters], queryFn: () => adminApi.auditLogs(filters) });
}
/**
 * สร้าง mutation ที่แสดง error/success message และ invalidate cache กลุ่มข้อมูลที่เกี่ยวข้องเมื่อสำเร็จ
 * คืน mutation ให้ caller ใช้ mutate/mutateAsync; การ invalidate เริ่มแบบไม่รอ refetch จบ
 */
export function useAction<T, R>(
  action: (value: T) => Promise<R>,
  success?: string,
) {
  const client = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["notifications"] });
      void client.invalidateQueries({ queryKey: ["bookings"] });
      void client.invalidateQueries({ queryKey: ["classrooms"] });
      void client.invalidateQueries({ queryKey: ["users"] });
      void client.invalidateQueries({ queryKey: ["admin"] });
      if (success) void message.success(success);
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

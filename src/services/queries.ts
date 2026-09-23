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
import { mockService } from "./mockService";
import type { AuthPortal } from "../stores/authStore";
export function useDatabase() {
  return useQuery({ queryKey: ["database"], queryFn: mockService.database });
}

export function useClassrooms(filters: ClassroomFilters = {}) {
  return useQuery({
    queryKey: ["classrooms", filters],
    queryFn: () => classroomsApi.list(filters),
  });
}

export function useClassroom(id: string | undefined) {
  return useQuery({
    queryKey: ["classrooms", id],
    queryFn: () => classroomsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useClassroomsAvailability(range: ClassroomRange | undefined) {
  return useQuery({
    queryKey: ["classrooms", "availability", range],
    queryFn: () => classroomsApi.availability(range!),
    enabled: Boolean(range?.classroomIds?.length),
  });
}

export function useClassroomSchedule(range: ClassroomRange | undefined) {
  return useQuery({
    queryKey: ["classrooms", "schedule", range],
    queryFn: () => classroomsApi.schedule(range!),
    enabled: Boolean(range?.classroomIds?.length),
  });
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => bookingsApi.list(filters),
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => bookingsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useNotifications(portal: AuthPortal, filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ["notifications", portal, filters],
    queryFn: () => notificationsApi.list(portal, filters),
  });
}

export function useUnreadNotificationCount(portal: AuthPortal) {
  return useQuery({
    queryKey: ["notifications", portal, "unread-count"],
    queryFn: () => notificationsApi.unreadCount(portal),
  });
}

export function useMyProfile() {
  return useQuery({ queryKey: ["users", "me"], queryFn: usersApi.me });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["users", "me", "bookings"],
    queryFn: () => usersApi.myBookings({ limit: 100 }),
  });
}

export function useBusinessRules() {
  return useQuery({
    queryKey: ["config", "business-rules"],
    queryFn: usersApi.businessRules,
    staleTime: 5 * 60_000,
  });
}

export function useAdminDashboard() {
  return useQuery({ queryKey: ["admin", "dashboard"], queryFn: adminApi.dashboardSummary });
}

export function useAdminReportSummary() {
  return useQuery({ queryKey: ["admin", "reports", "summary"], queryFn: adminApi.reportsSummary });
}

export function useAdminRecentBookings() {
  return useQuery({ queryKey: ["admin", "recent-bookings"], queryFn: () => adminApi.recentBookings(8) });
}

export function useAdminClassrooms(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "classrooms", filters], queryFn: () => adminApi.classrooms(filters) });
}

export function useAdminClassroom(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "classrooms", id], queryFn: () => adminApi.classroom(id!), enabled: Boolean(id) });
}

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

export function useAdminBooking(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "bookings", id], queryFn: () => adminApi.booking(id!), enabled: Boolean(id) });
}

export function useAdminUsers(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "users", filters], queryFn: () => adminApi.users(filters) });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({ queryKey: ["admin", "users", id], queryFn: () => adminApi.user(id!), enabled: Boolean(id) });
}

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

export function useAuditLogs(filters: AdminFilters = {}) {
  return useQuery({ queryKey: ["admin", "audit-logs", filters], queryFn: () => adminApi.auditLogs(filters) });
}
export function useAction<T, R>(
  action: (value: T) => Promise<R>,
  success?: string,
) {
  const client = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["database"] });
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

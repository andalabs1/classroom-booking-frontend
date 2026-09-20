import dayjs from 'dayjs'
import { adminAxiosClient as axiosClient } from './axiosClient'
import { toBooking } from './bookings'
import { toRoom } from './classrooms'
import type { ApiResponse } from './types'
import type { Booking, Role, Room, User } from '../types'

type ApiMeta = { page?: number; limit?: number; total?: number }
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta }
type ApiRoom = Parameters<typeof toRoom>[0]
type ApiBooking = Parameters<typeof toBooking>[0] & {
  bookingCode?: string
  adminNote?: string | null
  cancelReason?: string | null
  user?: ApiUser
  classroom?: ApiRoom
}
type ApiUser = {
  id: string | number
  userCode?: string | null
  name: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  role: Role
  status: User['status']
  createdAt: string
  updatedAt?: string
}

export type AdminUser = User & { userCode: string | null; name: string }
export type AdminBooking = Booking & {
  bookingCode: string
  user?: AdminUser
  classroom?: Room
  adminNote?: string | null
  cancelReason?: string | null
}
export type AdminRoomInput = Omit<Room, 'id' | 'image' | 'status' | 'floor'> & {
  floor: string
  imageUrl?: string | null
  status: 'AVAILABLE' | 'INACTIVE' | 'MAINTENANCE'
}
export type AdminUserInput = {
  name: string
  userCode?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  password?: string
  role?: Role
  status?: User['status']
}
export type AdminFilters = {
  search?: string
  status?: string
  page?: number
  limit?: number
  building?: string
  role?: Role
  classroomId?: string
  userId?: string
  startDate?: string
  endDate?: string
  action?: string
  entity?: string
}
export type DashboardSummary = {
  users: number
  activeUsers: number
  classrooms: number
  bookings: number
  pending: number
  confirmed: number
  inUse: number
  completed: number
  noShow: number
  cancelled: number
  todayBookings: number
  mostBookedClassroom: (Room & { bookingCount: number }) | null
}
export type AuditLog = {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  createdAt: string
  user?: AdminUser | null
}
export type ReportFilters = Pick<AdminFilters, 'status' | 'classroomId' | 'userId' | 'startDate' | 'endDate'>
export type ReportSummary = {
  users: number
  classrooms: number
  bookings: number
  byStatus: { status: string; _count: { _all: number } }[]
}

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

function toUser(user: ApiUser): AdminUser {
  const names = user.name.trim().split(/\s+/)
  return {
    id: String(user.id),
    userCode: user.userCode ?? null,
    name: user.name,
    firstName: user.firstName ?? names[0] ?? '',
    lastName: user.lastName ?? names.slice(1).join(' '),
    phone: user.phone ?? '',
    email: user.email,
    role: user.role,
    status: user.status,
    registeredAt: user.createdAt,
  }
}

function toAdminBooking(booking: ApiBooking): AdminBooking {
  return {
    ...toBooking(booking),
    bookingCode: booking.bookingCode ?? String(booking.id),
    user: booking.user ? toUser(booking.user) : undefined,
    classroom: booking.classroom ? toRoom(booking.classroom) : undefined,
    adminNote: booking.adminNote,
    cancelReason: booking.cancelReason,
  }
}

function toAdminRoomInput(room: Room): AdminRoomInput {
  return {
    code: room.code,
    name: room.name,
    building: room.building,
    floor: String(room.floor),
    capacity: room.capacity,
    description: room.description,
    category: room.category,
    equipment: room.equipment,
    imageUrl: room.image === '/room-placeholder.svg' ? null : room.image,
    status: room.status === 'ACTIVE' ? 'AVAILABLE' : room.status,
  }
}

async function list<T>(path: string, params?: object) {
  const response = await axiosClient.get<ApiListResponse<T[]>>(path, { params })
  return { items: dataOrThrow(response.data), total: response.data.meta?.total ?? 0 }
}

export const adminApi = {
  async dashboardSummary() {
    const response = await axiosClient.get<ApiResponse<DashboardSummary>>('/admin/dashboard/summary')
    const data = dataOrThrow(response.data)
    return {
      ...data,
      mostBookedClassroom: data.mostBookedClassroom ? toRoom(data.mostBookedClassroom) : null,
    }
  },

  async recentBookings(limit = 10) {
    const response = await axiosClient.get<ApiResponse<ApiBooking[]>>('/admin/dashboard/recent-bookings', { params: { limit } })
    return dataOrThrow(response.data).map(toAdminBooking)
  },

  async classrooms(filters: AdminFilters = {}) {
    const result = await list<ApiRoom>('/admin/classrooms', filters)
    return { ...result, items: result.items.map(toRoom) }
  },

  async classroom(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiRoom & { bookings: ApiBooking[] }>>(`/admin/classrooms/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { room: toRoom(data), bookings: data.bookings.map(toAdminBooking) }
  },

  async createClassroom(room: Room) {
    const response = await axiosClient.post<ApiResponse<ApiRoom>>('/admin/classrooms', toAdminRoomInput(room))
    return toRoom(dataOrThrow(response.data))
  },

  async updateClassroom(id: string, room: Room) {
    const response = await axiosClient.patch<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}`, toAdminRoomInput(room))
    return toRoom(dataOrThrow(response.data))
  },

  async setClassroomStatus(id: string, status: AdminRoomInput['status']) {
    const response = await axiosClient.patch<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}/status`, { status })
    return toRoom(dataOrThrow(response.data))
  },

  async deactivateClassroom(id: string) {
    const response = await axiosClient.delete<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}`)
    return toRoom(dataOrThrow(response.data))
  },

  async bookings(filters: AdminFilters = {}) {
    const result = await list<ApiBooking>('/admin/bookings', filters)
    return { ...result, items: result.items.map(toAdminBooking) }
  },

  async booking(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiBooking & { history: AuditLog[] }>>(`/admin/bookings/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { booking: toAdminBooking(data), history: data.history.map(toAuditLog) }
  },

  approveBooking(id: string) {
    return bookingAction(id, 'approve')
  },
  rejectBooking(id: string, adminNote: string) {
    return bookingAction(id, 'reject', { adminNote })
  },
  cancelBooking(id: string, reason: string) {
    return bookingAction(id, 'cancel', { reason })
  },
  startBooking(id: string) {
    return bookingAction(id, 'start')
  },
  completeBooking(id: string) {
    return bookingAction(id, 'complete')
  },
  noShowBooking(id: string, reason?: string) {
    return bookingAction(id, 'no-show', reason ? { reason } : undefined)
  },

  async users(filters: AdminFilters = {}) {
    const result = await list<ApiUser>('/admin/users', filters)
    return { ...result, items: result.items.map(toUser) }
  },

  async user(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiUser & { bookings: ApiBooking[] }>>(`/admin/users/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { user: toUser(data), bookings: data.bookings.map(toAdminBooking) }
  },

  async createUser(input: AdminUserInput & { password: string }) {
    const response = await axiosClient.post<ApiResponse<ApiUser>>('/admin/users', input)
    return toUser(dataOrThrow(response.data))
  },

  async updateUser(id: string, input: Omit<AdminUserInput, 'password' | 'role' | 'status'>) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}`, input)
    return toUser(dataOrThrow(response.data))
  },

  async setUserRole(id: string, role: Role) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}/role`, { role })
    return toUser(dataOrThrow(response.data))
  },

  async setUserStatus(id: string, status: User['status']) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}/status`, { status })
    return toUser(dataOrThrow(response.data))
  },

  async resetUserPassword(id: string, newPassword: string) {
    const response = await axiosClient.patch<ApiResponse<null>>(`/admin/users/${encodeURIComponent(id)}/reset-password`, { newPassword })
    return dataOrThrow(response.data)
  },

  async deactivateUser(id: string) {
    const response = await axiosClient.delete<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}`)
    return toUser(dataOrThrow(response.data))
  },

  async reportsSummary() {
    const response = await axiosClient.get<ApiResponse<ReportSummary>>('/admin/reports/summary')
    return dataOrThrow(response.data)
  },

  async reportsBookings(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ total: number; byStatus: ReportSummary['byStatus']; rows: ApiBooking[] }>>(
      '/admin/reports/bookings',
      { params: filters },
    )
    const data = dataOrThrow(response.data)
    return { ...data, rows: data.rows.map(toAdminBooking) }
  },

  async reportsClassrooms(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ classroom: ApiRoom; bookingCount: number; totalHours: number }[]>>(
      '/admin/reports/classrooms',
      { params: filters },
    )
    return dataOrThrow(response.data).map((item) => ({ ...item, classroom: toRoom(item.classroom) }))
  },

  async reportsUsers(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ user: ApiUser | null; bookingCount: number }[]>>('/admin/reports/users', { params: filters })
    return dataOrThrow(response.data).map((item) => ({ ...item, user: item.user ? toUser(item.user) : null }))
  },

  async exportBookings(filters: ReportFilters = {}) {
    const response = await axiosClient.get('/admin/reports/export', {
      params: filters,
      responseType: 'blob',
    })
    return response.data as Blob
  },

  async auditLogs(filters: AdminFilters = {}) {
    const result = await list<AuditLog>('/admin/audit-logs', filters)
    return { ...result, items: result.items.map(toAuditLog) }
  },
}

function toAuditLog(log: AuditLog): AuditLog {
  return {
    ...log,
    id: String(log.id),
    userId: log.userId == null ? null : String(log.userId),
    entityId: log.entityId == null ? null : String(log.entityId),
    user: log.user ? toUser(log.user as unknown as ApiUser) : null,
  }
}

async function bookingAction(id: string, action: string, payload?: object) {
  const response = await axiosClient.patch<ApiResponse<ApiBooking>>(`/admin/bookings/${encodeURIComponent(id)}/${action}`, payload)
  return toAdminBooking(dataOrThrow(response.data))
}

export const adminDate = (value: string) => dayjs(value).format('YYYY-MM-DD')

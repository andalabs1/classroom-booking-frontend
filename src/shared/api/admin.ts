import dayjs from 'dayjs'
import { adminAxiosClient as axiosClient } from './axiosClient'
import { toBooking } from './bookings'
import { toRoom } from './classrooms'
import type { ApiResponse } from './types'
import type { Booking, Role, Room, User } from '../types/index'

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
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
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
  & {
    userRole?: Role
    building?: string
    floor?: string
    category?: string
    search?: string
  }
export type ReportSummary = {
  users: number
  classrooms: number
  bookings: number
  byStatus: { status: string; _count: { _all: number } }[]
  bookingsGraph: {
    timezone: string
    startDate: string
    endDate: string
    data: { date: string; count: number }[]
  }
  statusPie: {
    total: number
    data: { status: Booking['status']; count: number; percentage: number }[]
  }
}

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

/**
 * แปลงบัญชี API เป็น AdminUser โดยคง role/userCode/name และใช้ string สำหรับ database ID
 */
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

/**
 * ต่อยอด toBooking ด้วย bookingCode ผู้จอง ห้อง และหมายเหตุสำหรับหน้าจัดการ admin
 */
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

/**
 * แปลงเฉพาะ filter สถานะ APPROVED เป็น CONFIRMED โดยคง filter อื่นไว้
 */
function toApiBookingFilters<T extends { status?: string }>(filters: T) {
  return filters.status === 'APPROVED'
    ? { ...filters, status: 'CONFIRMED' }
    : filters
}

/**
 * แปลงสถานะใน statusPie เป็นรูปแบบ UI โดยคงยอดรวม กราฟ และ byStatus จาก backend
 */
function toReportSummary(summary: Omit<ReportSummary, 'statusPie'> & {
  statusPie: Omit<ReportSummary['statusPie'], 'data'> & {
    data: { status: string; count: number; percentage: number }[]
  }
}): ReportSummary {
  return {
    ...summary,
    statusPie: {
      ...summary.statusPie,
      data: summary.statusPie.data.map((item) => ({
        ...item,
        status: item.status === 'CONFIRMED' ? 'APPROVED' : item.status as Booking['status'],
      })),
    },
  }
}

/**
 * แปลง Room กลับเป็น payload admin โดยส่งชั้นเป็น string และ placeholder image เป็น null
 */
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
    status: room.status,
  }
}

/**
 * โหลดรายการ admin ตาม path/params และคืนข้อมูลดิบพร้อม pagination
 * แต่ละ API method เป็นผู้แปลง items ให้ตรงกับ domain ของ UI
 */
async function list<T>(path: string, params?: object) {
  const response = await axiosClient.get<ApiListResponse<T[]>>(path, { params })
  return {
    items: dataOrThrow(response.data),
    total: response.data.meta?.total ?? 0,
    page: response.data.meta?.page ?? 1,
    limit: response.data.meta?.limit ?? 20,
  }
}

export const adminApi = {
  /**
   * โหลดตัวเลข dashboard และแปลง mostBookedClassroom เป็น Room เมื่อมีข้อมูล
   */
  async dashboardSummary() {
    const response = await axiosClient.get<ApiResponse<DashboardSummary>>('/admin/dashboard/summary')
    const data = dataOrThrow(response.data)
    return {
      ...data,
      mostBookedClassroom: data.mostBookedClassroom ? toRoom(data.mostBookedClassroom) : null,
    }
  },

  /**
   * โหลดรายการจองที่สร้างล่าสุดตาม limit และแปลงเป็น AdminBooking
   */
  async recentBookings(limit = 10) {
    const response = await axiosClient.get<ApiResponse<ApiBooking[]>>('/admin/dashboard/recent-bookings', { params: { limit } })
    return dataOrThrow(response.data).map(toAdminBooking)
  },

  /**
   * ค้นหาห้องสำหรับ admin และคืน Room พร้อม pagination
   */
  async classrooms(filters: AdminFilters = {}) {
    const result = await list<ApiRoom>('/admin/classrooms', filters)
    return { ...result, items: result.items.map(toRoom) }
  },

  /**
   * โหลดรายละเอียดห้องพร้อมประวัติการจอง แล้วคืน room/bookings สำหรับหน้ารายละเอียด
   */
  async classroom(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiRoom & { bookings: ApiBooking[] }>>(`/admin/classrooms/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { room: toRoom(data), bookings: data.bookings.map(toAdminBooking) }
  },

  /**
   * แปลง Room เป็น payload แล้วสร้างห้องผ่าน admin API; คืน Room ที่บันทึกแล้ว
   */
  async createClassroom(room: Room) {
    const response = await axiosClient.post<ApiResponse<ApiRoom>>('/admin/classrooms', toAdminRoomInput(room))
    return toRoom(dataOrThrow(response.data))
  },

  /**
   * แก้ข้อมูลห้องตาม ID ด้วย payload ที่แปลงจาก Room และคืนข้อมูลล่าสุด
   */
  async updateClassroom(id: string, room: Room) {
    const response = await axiosClient.patch<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}`, toAdminRoomInput(room))
    return toRoom(dataOrThrow(response.data))
  },

  /**
   * เปลี่ยนสถานะห้องเป็น ACTIVE/INACTIVE/MAINTENANCE และคืน Room ล่าสุด
   */
  async setClassroomStatus(id: string, status: AdminRoomInput['status']) {
    const response = await axiosClient.patch<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}/status`, { status })
    return toRoom(dataOrThrow(response.data))
  },

  /**
   * เรียก DELETE เพื่อปิดห้องแบบ soft delete แล้วคืน Room ที่เปลี่ยนสถานะ
   */
  async deactivateClassroom(id: string) {
    const response = await axiosClient.delete<ApiResponse<ApiRoom>>(`/admin/classrooms/${encodeURIComponent(id)}`)
    return toRoom(dataOrThrow(response.data))
  },

  /**
   * ค้นหาการจองทุกผู้ใช้สำหรับ admin พร้อมแปลง status filter และคืน AdminBooking/pagination
   */
  async bookings(filters: AdminFilters = {}) {
    const result = await list<ApiBooking>('/admin/bookings', toApiBookingFilters(filters))
    return { ...result, items: result.items.map(toAdminBooking) }
  },

  /**
   * โหลดการจองรายรายการพร้อมประวัติ audit แล้วแปลงข้อมูลทั้งสองส่วนสำหรับ UI
   */
  async booking(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiBooking & { history: AuditLog[] }>>(`/admin/bookings/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { booking: toAdminBooking(data), history: data.history.map(toAuditLog) }
  },

  /**
   * ขออนุมัติ booking ผ่าน action approve และคืน AdminBooking หลัง backend ตรวจเงื่อนไข
   */
  approveBooking(id: string) {
    return bookingAction(id, 'approve')
  },
  /**
   * ขอปฏิเสธ booking พร้อม adminNote และคืนรายการล่าสุด
   */
  rejectBooking(id: string, adminNote: string) {
    return bookingAction(id, 'reject', { adminNote })
  },
  /**
   * ขอยกเลิก booking โดย admin พร้อม reason และคืนรายการล่าสุด
   */
  cancelBooking(id: string, reason: string) {
    return bookingAction(id, 'cancel', { reason })
  },
  /**
   * ขอเปลี่ยน booking เป็นเริ่มใช้งานผ่าน action start และคืนรายการล่าสุด
   */
  startBooking(id: string) {
    return bookingAction(id, 'start')
  },
  /**
   * ขอปิดการใช้งาน booking ผ่าน action complete และคืนรายการล่าสุด
   */
  completeBooking(id: string) {
    return bookingAction(id, 'complete')
  },
  /**
   * ขอทำเครื่องหมายไม่เข้าใช้งาน พร้อมเหตุผลเมื่อมี แล้วคืนรายการล่าสุด
   */
  noShowBooking(id: string, reason?: string) {
    return bookingAction(id, 'no-show', reason ? { reason } : undefined)
  },

  /**
   * ค้นหาผู้ใช้สำหรับ admin และคืน AdminUser พร้อม pagination
   */
  async users(filters: AdminFilters = {}) {
    const result = await list<ApiUser>('/admin/users', filters)
    return { ...result, items: result.items.map(toUser) }
  },

  /**
   * โหลดบัญชีรายรายการพร้อมประวัติการจอง แล้วแปลงข้อมูลสำหรับหน้ารายละเอียดผู้ใช้
   */
  async user(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiUser & { bookings: ApiBooking[] }>>(`/admin/users/${encodeURIComponent(id)}`)
    const data = dataOrThrow(response.data)
    return { user: toUser(data), bookings: data.bookings.map(toAdminBooking) }
  },

  /**
   * สร้างผู้ใช้ด้วยข้อมูลและรหัสผ่านเริ่มต้นที่ admin กำหนด แล้วคืน AdminUser
   */
  async createUser(input: AdminUserInput & { password: string }) {
    const response = await axiosClient.post<ApiResponse<ApiUser>>('/admin/users', input)
    return toUser(dataOrThrow(response.data))
  },

  /**
   * แก้เฉพาะข้อมูลโปรไฟล์; role/status/password มี endpoint สำหรับจัดการแยกกัน
   */
  async updateUser(id: string, input: Omit<AdminUserInput, 'password' | 'role' | 'status'>) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}`, input)
    return toUser(dataOrThrow(response.data))
  },

  /**
   * เปลี่ยน role ของบัญชี แล้วคืนผู้ใช้ที่ backend ตรวจและบันทึกแล้ว
   */
  async setUserRole(id: string, role: Role) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}/role`, { role })
    return toUser(dataOrThrow(response.data))
  },

  /**
   * เปลี่ยนสถานะบัญชีตามค่าที่ส่งมา และคืน AdminUser ล่าสุด
   */
  async setUserStatus(id: string, status: User['status']) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}/status`, { status })
    return toUser(dataOrThrow(response.data))
  },

  /**
   * ให้ admin ตั้งรหัสผ่านใหม่ผ่าน endpoint reset-password; คืน data เมื่อสำเร็จ
   */
  async resetUserPassword(id: string, newPassword: string) {
    const response = await axiosClient.patch<ApiResponse<null>>(`/admin/users/${encodeURIComponent(id)}/reset-password`, { newPassword })
    return dataOrThrow(response.data)
  },

  /**
   * เรียก DELETE เพื่อปิดบัญชีแบบ soft delete และคืน AdminUser ที่เปลี่ยนสถานะ
   */
  async deactivateUser(id: string) {
    const response = await axiosClient.delete<ApiResponse<ApiUser>>(`/admin/users/${encodeURIComponent(id)}`)
    return toUser(dataOrThrow(response.data))
  },

  /**
   * โหลดสรุปรายงานรวมจาก backend แล้วแปลง statusPie ให้ใช้สถานะ UI
   * endpoint นี้ไม่รับตัวกรองของหน้ารายงาน
   */
  async reportsSummary() {
    const response = await axiosClient.get<ApiResponse<ReportSummary>>('/admin/reports/summary')
    return toReportSummary(dataOrThrow(response.data))
  },

  /**
   * โหลดรายการและยอดแยกสถานะตาม report filters แล้วแปลง rows เป็น AdminBooking
   */
  async reportsBookings(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ total: number; byStatus: ReportSummary['byStatus']; rows: ApiBooking[] }>>(
      '/admin/reports/bookings',
      { params: toApiBookingFilters(filters) },
    )
    const data = dataOrThrow(response.data)
    return { ...data, rows: data.rows.map(toAdminBooking) }
  },

  /**
   * โหลดสถิติการจองแยกห้องตาม report filters และแปลงข้อมูลห้องสำหรับ UI
   */
  async reportsClassrooms(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ classroom: ApiRoom; bookingCount: number; totalHours: number }[]>>(
      '/admin/reports/classrooms',
      { params: toApiBookingFilters(filters) },
    )
    return dataOrThrow(response.data).map((item) => ({ ...item, classroom: toRoom(item.classroom) }))
  },

  /**
   * โหลดจำนวนการจองแยกผู้ใช้ตาม report filters และแปลง user เมื่อมีข้อมูล
   */
  async reportsUsers(filters: ReportFilters = {}) {
    const response = await axiosClient.get<ApiResponse<{ user: ApiUser | null; bookingCount: number }[]>>('/admin/reports/users', { params: toApiBookingFilters(filters) })
    return dataOrThrow(response.data).map((item) => ({ ...item, user: item.user ? toUser(item.user) : null }))
  },

  /**
   * ขอไฟล์ CSV ตาม report filters เป็น Blob โดยให้ caller สร้างลิงก์ดาวน์โหลดและคืน object URL เอง
   */
  async exportBookings(filters: ReportFilters = {}) {
    const response = await axiosClient.get('/admin/reports/export', {
      params: toApiBookingFilters(filters),
      responseType: 'blob',
    })
    return response.data as Blob
  },

  /**
   * ค้นหา audit logs พร้อม pagination และแปลง ID/ผู้กระทำก่อนส่งให้หน้าตาราง
   */
  async auditLogs(filters: AdminFilters = {}) {
    const result = await list<AuditLog>('/admin/audit-logs', filters)
    return { ...result, items: result.items.map(toAuditLog) }
  },
}

/**
 * แปลง audit ID และ foreign keys เป็น string โดยคง null เมื่อไม่มีผู้กระทำหรือ entity
 */
function toAuditLog(log: AuditLog): AuditLog {
  return {
    ...log,
    id: String(log.id),
    userId: log.userId == null ? null : String(log.userId),
    entityId: log.entityId == null ? null : String(log.entityId),
    user: log.user ? toUser(log.user as unknown as ApiUser) : null,
  }
}

/**
 * ส่ง PATCH ไปยัง action ของ booking ผ่าน admin client แล้วแปลงผลเป็น AdminBooking
 */
async function bookingAction(id: string, action: string, payload?: object) {
  const response = await axiosClient.patch<ApiResponse<ApiBooking>>(`/admin/bookings/${encodeURIComponent(id)}/${action}`, payload)
  return toAdminBooking(dataOrThrow(response.data))
}

/**
 * แสดงวันที่จากข้อความเวลาเป็น YYYY-MM-DD ด้วย timezone ปัจจุบันของ dayjs
 */
export const adminDate = (value: string) => dayjs(value).format('YYYY-MM-DD')

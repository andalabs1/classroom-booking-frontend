import { userAxiosClient as axiosClient } from './axiosClient'
import { toBooking } from './bookings'
import type { ApiResponse } from './types'
import type { BookingStatus, User } from '../types/index'

type ApiUser = {
  id: string | number
  userCode?: string | null
  name: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  role: string
  status: User['status']
  createdAt: string
}

type ApiBooking = Parameters<typeof toBooking>[0]
type ApiMeta = { page?: number; limit?: number; total?: number }
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta }

export type UserProfile = User & {
  userCode: string | null
  name: string
}

export type ProfileInput = {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export type BusinessRules = {
  bookingCancelMinutes: number
  bookingMaxDurationHours: number
  bookingMaxAdvanceDays: number
  bookingOpenTime: string
  bookingCloseTime: string
  bookingCheckinEarlyMinutes: number
  bookingCheckinLateMinutes: number
  bookingReminderMinutes: number
  roles: string[]
  bookingStatuses: string[]
}

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

/**
 * แปลงโปรไฟล์เป็น UserProfile โดยคง userCode/name และเติมส่วนชื่อที่ API ไม่ส่งมา
 * รวม role ที่ไม่ใช่ ADMIN เป็น USER ตามแบบข้อมูล frontend
 */
function toProfile(user: ApiUser): UserProfile {
  const nameParts = user.name.trim().split(/\s+/)
  return {
    id: String(user.id),
    userCode: user.userCode ?? null,
    name: user.name,
    firstName: user.firstName ?? nameParts[0] ?? '',
    lastName: user.lastName ?? nameParts.slice(1).join(' '),
    email: user.email,
    phone: user.phone ?? '',
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    status: user.status,
    registeredAt: user.createdAt,
  }
}

/**
 * แปลง APPROVED เป็น CONFIRMED สำหรับตัวกรองประวัติการจองของ API
 */
function toApiBookingStatus(status: BookingStatus) {
  return status === 'APPROVED' ? 'CONFIRMED' : status
}

export const usersApi = {
  /**
   * โหลด directory ของบัญชี active สำหรับผู้มีสิทธิ์จาก user client แล้วแปลงเป็น UserProfile
   */
  async directory(search?: string) {
    const response = await axiosClient.get<ApiResponse<ApiUser[]>>('/users/directory', { params: search ? { search } : undefined })
    return dataOrThrow(response.data).map(toProfile)
  },

  /**
   * โหลดโปรไฟล์ของบัญชีใน user portal และแปลงเป็น UserProfile
   */
  async me() {
    const response = await axiosClient.get<ApiResponse<ApiUser>>('/users/me')
    return toProfile(dataOrThrow(response.data))
  },

  /**
   * แก้โปรไฟล์โดยประกอบ name จาก firstName/lastName แล้วคืนข้อมูลล่าสุด
   * caller เป็นผู้ปรับ auth store ให้ชื่อในเมนูตรงกับข้อมูลที่บันทึก
   */
  async updateMe(input: ProfileInput) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>('/users/me', {
      ...input,
      name: `${input.firstName} ${input.lastName}`.trim(),
    })
    return toProfile(dataOrThrow(response.data))
  },

  /**
   * ส่งรหัสผ่านปัจจุบันกับรหัสใหม่ให้ backend ตรวจและเปลี่ยน; คืน data ของ response เมื่อสำเร็จ
   */
  async changePassword(currentPassword: string, newPassword: string) {
    const response = await axiosClient.patch<ApiResponse<null>>('/users/me/password', { currentPassword, newPassword })
    return dataOrThrow(response.data)
  },

  /**
   * โหลดประวัติของผู้ใช้ปัจจุบัน พร้อมแปลงสถานะและคืน items/pagination
   */
  async myBookings(
    filters: {
      status?: BookingStatus
      page?: number
      limit?: number
    } = {},
  ) {
    const response = await axiosClient.get<ApiListResponse<ApiBooking[]>>('/users/me/bookings', {
      params: {
        ...filters,
        ...(filters.status ? { status: toApiBookingStatus(filters.status) } : {}),
      },
    })
    return {
      items: dataOrThrow(response.data).map(toBooking),
      total: response.data.meta?.total ?? 0,
      page: response.data.meta?.page ?? filters.page ?? 1,
      limit: response.data.meta?.limit ?? filters.limit ?? 20,
    }
  },

  /**
   * โหลดกติกาการจองจาก backend เพื่อให้ frontend ใช้ตรวจฟอร์มและสร้างช่วงเวลาที่เลือกได้
   */
  async businessRules() {
    const response = await axiosClient.get<ApiResponse<BusinessRules>>('/config/business-rules')
    return dataOrThrow(response.data)
  },
}

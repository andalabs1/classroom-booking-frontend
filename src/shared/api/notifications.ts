import { authenticatedClient } from './axiosClient'
import type { AuthPortal } from '../stores/authStore'
import type { ApiResponse } from './types'
import type { BookingNotification } from '../types/index'

type ApiNotification = {
  id: string | number
  userId: string | number
  bookingId?: string | number | null
  title: string
  message: string
  type: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

type ApiMeta = { page?: number; limit?: number; total?: number }
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta }

export type NotificationFilters = {
  isRead?: boolean
  page?: number
  limit?: number
}

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

/**
 * จัดกลุ่มชนิดแจ้งเตือนจากข้อความ type ของ backend สำหรับเลือกสีและไอคอนใน UI
 * ชนิดที่ไม่เข้าเงื่อนไขใช้ BOOKING เป็นกลุ่มทั่วไป
 */
function kindFor(type: string): BookingNotification['kind'] {
  if (type.includes('REMINDER')) return 'REMINDER'
  if (type.includes('REJECT')) return 'REJECTED'
  if (type.includes('CANCEL')) return 'CANCELLED'
  if (type.includes('CONFIRM') || type.includes('APPROV')) return 'APPROVED'
  return 'BOOKING'
}

/**
 * แปลง notification ID เป็น string และ type เป็น kind; UI ใช้ readAt แทนสถานะอ่าน
 */
function toNotification(item: ApiNotification): BookingNotification {
  return {
    id: String(item.id),
    userId: String(item.userId),
    bookingId: item.bookingId == null ? null : String(item.bookingId),
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    readAt: item.readAt,
    kind: kindFor(item.type),
  }
}

export const notificationsApi = {
  /**
   * โหลดแจ้งเตือนด้วย session ของ portal และแปลง isRead เป็นข้อความตาม query API
   * คืน items ที่แปลงแล้วและ total จาก meta
   */
  async list(portal: AuthPortal, filters: NotificationFilters = {}) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.get<ApiListResponse<ApiNotification[]>>('/notifications', {
      params: {
        ...filters,
        ...(filters.isRead === undefined ? {} : { isRead: String(filters.isRead) }),
      },
    })
    return {
      items: dataOrThrow(response.data).map(toNotification),
      total: response.data.meta?.total ?? 0,
    }
  },

  /**
   * คืนจำนวนแจ้งเตือนที่ยังไม่อ่านของบัญชีใน portal ที่ระบุ
   */
  async unreadCount(portal: AuthPortal) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
    return dataOrThrow(response.data).count
  },

  /**
   * ทำเครื่องหมายอ่านทั้งหมดของบัญชีใน portal และคืนจำนวนที่อัปเดต
   */
  async markAllRead(portal: AuthPortal) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.patch<ApiResponse<{ updated: number }>>('/notifications/read-all')
    return dataOrThrow(response.data)
  },

  /**
   * ทำเครื่องหมายอ่านรายรายการด้วย session ของ portal แล้วคืน notification ล่าสุด
   */
  async markRead(portal: AuthPortal, id: string) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.patch<ApiResponse<ApiNotification>>(`/notifications/${encodeURIComponent(id)}/read`)
    return toNotification(dataOrThrow(response.data))
  },
}

import { authenticatedClient } from './axiosClient'
import type { AuthPortal } from '../stores/authStore'
import type { ApiResponse } from './types'
import type { BookingNotification } from '../types'

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

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

function kindFor(type: string): BookingNotification['kind'] {
  if (type.includes('REMINDER')) return 'REMINDER'
  if (type.includes('REJECT')) return 'REJECTED'
  if (type.includes('CANCEL')) return 'CANCELLED'
  if (type.includes('CONFIRM') || type.includes('APPROV')) return 'APPROVED'
  return 'BOOKING'
}

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

  async unreadCount(portal: AuthPortal) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
    return dataOrThrow(response.data).count
  },

  async markAllRead(portal: AuthPortal) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.patch<ApiResponse<{ updated: number }>>('/notifications/read-all')
    return dataOrThrow(response.data)
  },

  async markRead(portal: AuthPortal, id: string) {
    const axiosClient = authenticatedClient(portal)
    const response = await axiosClient.patch<ApiResponse<ApiNotification>>(`/notifications/${encodeURIComponent(id)}/read`)
    return toNotification(dataOrThrow(response.data))
  },
}

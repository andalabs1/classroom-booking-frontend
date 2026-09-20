import { userAxiosClient as axiosClient } from './axiosClient'
import { toBooking } from './bookings'
import type { ApiResponse } from './types'
import type { BookingStatus, User } from '../types'

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

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

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

function toApiBookingStatus(status: BookingStatus) {
  return status === 'APPROVED' ? 'CONFIRMED' : status
}

export const usersApi = {
  async directory(search?: string) {
    const response = await axiosClient.get<ApiResponse<ApiUser[]>>('/users/directory', { params: search ? { search } : undefined })
    return dataOrThrow(response.data).map(toProfile)
  },

  async me() {
    const response = await axiosClient.get<ApiResponse<ApiUser>>('/users/me')
    return toProfile(dataOrThrow(response.data))
  },

  async updateMe(input: ProfileInput) {
    const response = await axiosClient.patch<ApiResponse<ApiUser>>('/users/me', {
      ...input,
      name: `${input.firstName} ${input.lastName}`.trim(),
    })
    return toProfile(dataOrThrow(response.data))
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await axiosClient.patch<ApiResponse<null>>('/users/me/password', { currentPassword, newPassword })
    return dataOrThrow(response.data)
  },

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

  async businessRules() {
    const response = await axiosClient.get<ApiResponse<BusinessRules>>('/config/business-rules')
    return dataOrThrow(response.data)
  },
}

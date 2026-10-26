import dayjs from 'dayjs'
import { userAxiosClient as axiosClient } from './axiosClient'
import { toRoom } from './classrooms'
import type { ApiResponse } from './types'
import type { Booking, BookingDraft, BookingStatus } from '../types/index'

type ApiBookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_USE' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

type ApiClassroom = Parameters<typeof toRoom>[0]
type ApiBooking = {
  id: string | number
  userId: string | number
  classroomId: string | number
  purpose: string
  attendeeCount: number
  requestedEquipment?: unknown
  description?: string | null
  startAt: string
  endAt: string
  status: ApiBookingStatus
  createdAt: string
  cancelReason?: string | null
  adminNote?: string | null
  classroom?: ApiClassroom
}

export type BookingCalendarView = 'daily' | 'weekly' | 'monthly'

type ApiMeta = {
  page?: number
  limit?: number
  total?: number
  view?: BookingCalendarView
  date?: string
  startAt?: string
  endAt?: string
}
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta }

export type BookingFilters = {
  search?: string
  status?: BookingStatus
  startDate?: string
  endDate?: string
  scope?: 'mine' | 'all'
  userId?: string
  page?: number
  limit?: number
  view?: BookingCalendarView
  date?: string
}

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

/**
 * แปลง CONFIRMED ของ backend เป็น APPROVED ที่ UI ใช้ โดยคงสถานะอื่นตามเดิม
 */
function toStatus(status: ApiBookingStatus): BookingStatus {
  return status === 'CONFIRMED' ? 'APPROVED' : status
}

/**
 * แปลง APPROVED ของ UI กลับเป็น CONFIRMED ก่อนส่งตัวกรองให้ backend
 */
function toApiStatus(status: BookingStatus): ApiBookingStatus {
  return status === 'APPROVED' ? 'CONFIRMED' : status
}

/**
 * แปลง ID/status/ข้อมูลห้องและอุปกรณ์เป็น Booking ของ UI
 * แยกวันและเวลา startAt/endAt ด้วย timezone ของ browser ตามพฤติกรรม dayjs ปัจจุบัน
 */
export function toBooking(booking: ApiBooking): Booking {
  return {
    id: String(booking.id),
    userId: String(booking.userId),
    roomId: String(booking.classroomId),
    date: dayjs(booking.startAt).format('YYYY-MM-DD'),
    start: dayjs(booking.startAt).format('HH:mm'),
    end: dayjs(booking.endAt).format('HH:mm'),
    attendees: booking.attendeeCount,
    purpose: booking.purpose,
    equipment: Array.isArray(booking.requestedEquipment) ? booking.requestedEquipment.map(String) : [],
    note: booking.description ?? '',
    status: toStatus(booking.status),
    createdAt: booking.createdAt,
    reason: booking.cancelReason ?? booking.adminNote ?? undefined,
    room: booking.classroom ? toRoom(booking.classroom) : undefined,
  }
}

/**
 * แปลง BookingDraft เป็นชื่อฟิลด์ API และประกอบวันเวลาด้วย offset +07:00
 * ส่ง description เฉพาะเมื่อมี note เพื่อให้ backend รับข้อมูลตามสัญญาเดิม
 */
function toPayload(draft: BookingDraft) {
  return {
    classroomId: draft.roomId,
    purpose: draft.purpose,
    attendeeCount: draft.attendees,
    requestedEquipment: draft.equipment,
    ...(draft.note ? { description: draft.note } : {}),
    startAt: `${draft.date}T${draft.start}:00+07:00`,
    endAt: `${draft.date}T${draft.end}:00+07:00`,
  }
}

export const bookingsApi = {
  /**
   * ค้นหาการจองผ่าน user client แล้วคืน items พร้อม pagination และขอบเขตปฏิทินจาก meta
   * แปลงสถานะทั้งขาไปและขากลับให้ตรงกับรูปแบบของแต่ละฝั่ง
   */
  async list(filters: BookingFilters = {}) {
    const response = await axiosClient.get<ApiListResponse<ApiBooking[]>>('/bookings', {
      params: {
        ...filters,
        ...(filters.status ? { status: toApiStatus(filters.status) } : {}),
      },
    })
    return {
      items: dataOrThrow(response.data).map(toBooking),
      total: response.data.meta?.total ?? 0,
      page: response.data.meta?.page ?? filters.page ?? 1,
      limit: response.data.meta?.limit ?? filters.limit ?? 20,
      calendar: response.data.meta?.view
        ? {
            view: response.data.meta.view,
            date: response.data.meta.date ?? filters.date ?? '',
            startAt: response.data.meta.startAt,
            endAt: response.data.meta.endAt,
          }
        : undefined,
    }
  },

  /**
   * สร้าง booking จาก draft และคืนรายการที่ backend บันทึกแล้วในรูปแบบ UI
   */
  async create(draft: BookingDraft) {
    const response = await axiosClient.post<ApiResponse<ApiBooking>>('/bookings', toPayload(draft))
    return toBooking(dataOrThrow(response.data))
  },

  /**
   * โหลดรายละเอียด booking ตาม ID และคืนข้อมูลที่แปลงด้วย toBooking
   */
  async get(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiBooking>>(`/bookings/${encodeURIComponent(id)}`)
    return toBooking(dataOrThrow(response.data))
  },

  /**
   * ส่ง draft ไปแก้ booking ตาม ID; backend เป็นผู้ตรวจสถานะ สิทธิ์ และเวลาว่างอีกครั้ง
   */
  async update(id: string, draft: BookingDraft) {
    const response = await axiosClient.patch<ApiResponse<ApiBooking>>(`/bookings/${encodeURIComponent(id)}`, toPayload(draft))
    return toBooking(dataOrThrow(response.data))
  },

  /**
   * เรียก DELETE เพื่อยกเลิก booking พร้อมเหตุผลถ้ามี
   * backend เปลี่ยนสถานะเป็น CANCELLED และเก็บ record ไว้; คืนรายการหลังยกเลิก
   */
  async remove(id: string, reason?: string) {
    const response = await axiosClient.delete<ApiResponse<ApiBooking>>(`/bookings/${encodeURIComponent(id)}`, {
      data: reason ? { reason } : undefined,
    })
    return toBooking(dataOrThrow(response.data))
  },

  /**
   * ยกเลิก booking ผ่าน PATCH /cancel พร้อมเหตุผลถ้ามี แล้วคืนรายการที่อัปเดต
   */
  async cancel(id: string, reason?: string) {
    const response = await axiosClient.patch<ApiResponse<ApiBooking>>(`/bookings/${encodeURIComponent(id)}/cancel`, reason ? { reason } : undefined)
    return toBooking(dataOrThrow(response.data))
  },

  /**
   * ขอ check-in และคืน booking ที่ backend เปลี่ยนสถานะแล้ว
   * เงื่อนไขช่วงเวลาและสิทธิ์ตรวจจาก backend
   */
  async checkIn(id: string) {
    const response = await axiosClient.post<ApiResponse<ApiBooking>>(`/bookings/${encodeURIComponent(id)}/check-in`)
    return toBooking(dataOrThrow(response.data))
  },
}

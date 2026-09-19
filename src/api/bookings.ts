import dayjs from "dayjs";
import { axiosClient } from "./axiosClient";
import { toRoom } from "./classrooms";
import type { ApiResponse } from "./types";
import type { Booking, BookingDraft, BookingStatus } from "../types";

type ApiBookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_USE"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type ApiClassroom = Parameters<typeof toRoom>[0];
type ApiBooking = {
  id: string | number;
  userId: string | number;
  classroomId: string | number;
  purpose: string;
  attendeeCount: number;
  requestedEquipment?: unknown;
  description?: string | null;
  startAt: string;
  endAt: string;
  status: ApiBookingStatus;
  createdAt: string;
  cancelReason?: string | null;
  adminNote?: string | null;
  classroom?: ApiClassroom;
};

type ApiMeta = { page?: number; limit?: number; total?: number };
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta };

export type BookingFilters = {
  search?: string;
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  scope?: "mine" | "all";
  userId?: string;
  page?: number;
  limit?: number;
};

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? "ดำเนินการไม่สำเร็จ");
  return response.data;
}

function toStatus(status: ApiBookingStatus): BookingStatus {
  return status === "CONFIRMED" ? "APPROVED" : status;
}

function toApiStatus(status: BookingStatus): ApiBookingStatus {
  return status === "APPROVED" ? "CONFIRMED" : status;
}

export function toBooking(booking: ApiBooking): Booking {
  return {
    id: String(booking.id),
    userId: String(booking.userId),
    roomId: String(booking.classroomId),
    date: dayjs(booking.startAt).format("YYYY-MM-DD"),
    start: dayjs(booking.startAt).format("HH:mm"),
    end: dayjs(booking.endAt).format("HH:mm"),
    attendees: booking.attendeeCount,
    purpose: booking.purpose,
    equipment: Array.isArray(booking.requestedEquipment)
      ? booking.requestedEquipment.map(String)
      : [],
    note: booking.description ?? "",
    status: toStatus(booking.status),
    createdAt: booking.createdAt,
    reason: booking.cancelReason ?? booking.adminNote ?? undefined,
    room: booking.classroom ? toRoom(booking.classroom) : undefined,
  };
}

function toPayload(draft: BookingDraft) {
  return {
    classroomId: draft.roomId,
    purpose: draft.purpose,
    attendeeCount: draft.attendees,
    requestedEquipment: draft.equipment,
    ...(draft.note ? { description: draft.note } : {}),
    startAt: `${draft.date}T${draft.start}:00+07:00`,
    endAt: `${draft.date}T${draft.end}:00+07:00`,
  };
}

export const bookingsApi = {
  async list(filters: BookingFilters = {}) {
    const response = await axiosClient.get<ApiListResponse<ApiBooking[]>>(
      "/bookings",
      {
        params: {
          ...filters,
          ...(filters.status ? { status: toApiStatus(filters.status) } : {}),
        },
      },
    );
    return {
      items: dataOrThrow(response.data).map(toBooking),
      total: response.data.meta?.total ?? 0,
    };
  },

  async create(draft: BookingDraft) {
    const response = await axiosClient.post<ApiResponse<ApiBooking>>(
      "/bookings",
      toPayload(draft),
    );
    return toBooking(dataOrThrow(response.data));
  },

  async get(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiBooking>>(
      `/bookings/${encodeURIComponent(id)}`,
    );
    return toBooking(dataOrThrow(response.data));
  },

  async update(id: string, draft: BookingDraft) {
    const response = await axiosClient.patch<ApiResponse<ApiBooking>>(
      `/bookings/${encodeURIComponent(id)}`,
      toPayload(draft),
    );
    return toBooking(dataOrThrow(response.data));
  },

  async remove(id: string, reason?: string) {
    const response = await axiosClient.delete<ApiResponse<ApiBooking>>(
      `/bookings/${encodeURIComponent(id)}`,
      { data: reason ? { reason } : undefined },
    );
    return toBooking(dataOrThrow(response.data));
  },

  async cancel(id: string, reason?: string) {
    const response = await axiosClient.patch<ApiResponse<ApiBooking>>(
      `/bookings/${encodeURIComponent(id)}/cancel`,
      reason ? { reason } : undefined,
    );
    return toBooking(dataOrThrow(response.data));
  },

  async checkIn(id: string) {
    const response = await axiosClient.post<ApiResponse<ApiBooking>>(
      `/bookings/${encodeURIComponent(id)}/check-in`,
    );
    return toBooking(dataOrThrow(response.data));
  },
};

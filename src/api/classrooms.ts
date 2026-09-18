import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./types";
import type { Room } from "../types";

type ApiClassroom = {
  id: string | number;
  code?: string | null;
  name: string;
  building: string;
  floor: string | number;
  capacity: number;
  description?: string | null;
  category?: string | null;
  equipment?: unknown;
  imageUrl?: string | null;
  status: "AVAILABLE" | "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

type ApiBooking = {
  id: string | number;
  classroomId: string | number;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "IN_USE";
};

type ApiAvailabilityRoom = ApiClassroom & {
  available: boolean;
  conflicts: ApiBooking[];
};

type ApiScheduleRoom = ApiClassroom & {
  bookings: ApiBooking[];
};

type ApiMeta = { page?: number; limit?: number; total?: number };
type ApiListResponse<T> = ApiResponse<T> & { meta?: ApiMeta };

export type ClassroomFilters = {
  search?: string;
  building?: string;
  floor?: number;
  category?: string;
  status?: "ACTIVE" | "AVAILABLE" | "INACTIVE" | "MAINTENANCE";
  minCapacity?: number;
  equipment?: string;
  sort?: "code" | "capacity" | "name";
  page?: number;
  limit?: number;
};

export type ClassroomRange = {
  startAt: string;
  endAt: string;
  classroomIds?: string[];
};

export type AvailableClassroom = Room & {
  available: boolean;
  conflicts: ApiBooking[];
};

export type ScheduledBooking = {
  id: string;
  classroomId: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "APPROVED";
};

export type ScheduledClassroom = Room & { bookings: ScheduledBooking[] };

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? "ดำเนินการไม่สำเร็จ");
  return response.data;
}

export function toRoom(room: ApiClassroom): Room {
  return {
    id: String(room.id),
    code: room.code ?? "-",
    name: room.name,
    building: room.building,
    floor: Number(room.floor),
    capacity: room.capacity,
    description: room.description ?? "ไม่มีรายละเอียดห้องเรียน",
    equipment: Array.isArray(room.equipment) ? room.equipment.map(String) : [],
    image: room.imageUrl ?? "/room-placeholder.svg",
    category: room.category ?? "ห้องเรียน",
    status: room.status === "AVAILABLE" || room.status === "ACTIVE" ? "ACTIVE" : room.status,
  };
}

function rangeParams(range: ClassroomRange) {
  return {
    startAt: range.startAt,
    endAt: range.endAt,
    ...(range.classroomIds?.length
      ? { classroomIds: range.classroomIds.join(",") }
      : {}),
  };
}

export const classroomsApi = {
  async list(filters: ClassroomFilters = {}) {
    const response = await axiosClient.get<ApiListResponse<ApiClassroom[]>>(
      "/classrooms",
      { params: filters },
    );
    return {
      items: dataOrThrow(response.data).map(toRoom),
      total: response.data.meta?.total ?? 0,
    };
  },

  async availability(range: ClassroomRange) {
    const response = await axiosClient.get<
      ApiResponse<{
        startAt: string;
        endAt: string;
        rooms: ApiAvailabilityRoom[];
      }>
    >("/classrooms/availability", { params: rangeParams(range) });
    const data = dataOrThrow(response.data);
    return {
      ...data,
      rooms: data.rooms.map((room) => ({
        ...toRoom(room),
        available: room.available,
        conflicts: room.conflicts,
      })),
    };
  },

  async schedule(range: ClassroomRange) {
    const response = await axiosClient.get<
      ApiResponse<{
        startAt: string;
        endAt: string;
        rooms: ApiScheduleRoom[];
      }>
    >("/classrooms/schedule", { params: rangeParams(range) });
    const data = dataOrThrow(response.data);
    return {
      ...data,
      rooms: data.rooms.map((room) => ({
        ...toRoom(room),
        bookings: room.bookings.map((booking) => ({
          id: String(booking.id),
          classroomId: String(booking.classroomId),
          startAt: booking.startAt,
          endAt: booking.endAt,
          status:
            booking.status === "PENDING"
              ? ("PENDING" as const)
              : ("APPROVED" as const),
        })),
      })),
    };
  },

  async get(id: string) {
    const response = await axiosClient.get<ApiResponse<ApiClassroom>>(
      `/classrooms/${encodeURIComponent(id)}`,
    );
    return toRoom(dataOrThrow(response.data));
  },

  async availabilityForRoom(id: string, range: Omit<ClassroomRange, "classroomIds">) {
    const response = await axiosClient.get<ApiResponse<{ available: boolean }>>(
      `/classrooms/${encodeURIComponent(id)}/availability`,
      { params: range },
    );
    return dataOrThrow(response.data);
  },
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import {
  classroomsApi,
  type ClassroomFilters,
  type ClassroomRange,
} from "../api/classrooms";
import { bookingsApi, type BookingFilters } from "../api/bookings";
import { mockService } from "./mockService";
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
      if (success) void message.success(success);
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

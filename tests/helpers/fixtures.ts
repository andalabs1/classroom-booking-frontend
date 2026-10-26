import type { BookingDraft, User } from '../../src/shared/types/index'
import type { BusinessRules } from '../../src/shared/api/users'
import type { toRoom } from '../../src/shared/api/classrooms'
import type { toBooking } from '../../src/shared/api/bookings'

// Small contract examples for tests, not application seed data.
export const apiUser = {
  id: 42, userCode: 'ST-0042', name: 'Test User', email: 'test@example.com',
  role: 'USER' as const, status: 'ACTIVE' as const, createdAt: '2026-10-26T00:00:00Z',
}
export const sessionUser: User = {
  id: '42', firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '',
  role: 'USER', status: 'ACTIVE', registeredAt: apiUser.createdAt,
}
export const apiRoom: Parameters<typeof toRoom>[0] = {
  id: 7, code: 'A201', name: 'Classroom', building: 'A', floor: '2', capacity: 40,
  equipment: ['Projector', 'Wi-Fi'], imageUrl: 'https://example.com/room.jpg', status: 'ACTIVE',
}
export const apiBooking: Parameters<typeof toBooking>[0] = {
  id: 12, userId: 42, classroomId: 7, purpose: 'Project meeting', attendeeCount: 10,
  requestedEquipment: ['Projector'], description: 'Bring laptop',
  startAt: '2026-10-27T09:00:00+07:00', endAt: '2026-10-27T10:00:00+07:00',
  status: 'CONFIRMED', createdAt: '2026-10-26T00:00:00Z', classroom: apiRoom,
}
export const draft: BookingDraft = {
  roomId: '7', date: '2026-10-27', start: '09:00', end: '10:00', attendees: 10,
  purpose: 'Project meeting', equipment: ['Projector'], note: 'Bring laptop',
}
export const rules: BusinessRules = {
  bookingCancelMinutes: 60, bookingMaxDurationHours: 4, bookingMaxAdvanceDays: 90,
  bookingOpenTime: '08:00', bookingCloseTime: '20:00', bookingCheckinEarlyMinutes: 15,
  bookingCheckinLateMinutes: 15, bookingReminderMinutes: 60, roles: ['USER', 'ADMIN'],
  bookingStatuses: ['PENDING', 'CONFIRMED'],
}

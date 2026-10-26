import { describe, expect, it } from 'vitest'
import { adminApi, adminDate } from '../../../src/shared/api/admin'
import { toRoom } from '../../../src/shared/api/classrooms'
import { apiBooking, apiRoom, apiUser } from '../../helpers/fixtures'
import { clients, httpStub } from '../../helpers/http'

const http = httpStub(clients.admin)
const booking = { ...apiBooking, bookingCode: 'BK-0012', user: apiUser, adminNote: 'Reviewed' }
const log = { id: 4, userId: 42, entityId: 12, action: 'UPDATE', entity: 'BOOKING', createdAt: apiUser.createdAt, user: apiUser }
const report = {
  users: 20, classrooms: 5, bookings: 2, byStatus: [{ status: 'CONFIRMED', _count: { _all: 2 } }],
  bookingsGraph: { timezone: 'Asia/Bangkok', startDate: '2026-10-20', endDate: '2026-10-26', data: [{ date: '2026-10-26', count: 2 }] },
  statusPie: { total: 2, data: [{ status: 'CONFIRMED', count: 2, percentage: 100 }] },
}

describe('admin dashboard and classroom contracts', () => {
  it('loads dashboard metrics and normalizes the most booked classroom', async () => {
    http.reply({ users: 20, classrooms: 5, pending: 2, mostBookedClassroom: { ...apiRoom, bookingCount: 3 } })
    expect(await adminApi.dashboardSummary()).toMatchObject({ users: 20, pending: 2, mostBookedClassroom: { id: '7', floor: 2 } })
    expect(http.last().url).toBe('/admin/dashboard/summary')
    http.reply({ mostBookedClassroom: null })
    expect((await adminApi.dashboardSummary()).mostBookedClassroom).toBeNull()
  })
  it('loads recent bookings with nested users and room adapters', async () => {
    http.reply([booking])
    expect(await adminApi.recentBookings(8)).toMatchObject([{ id: '12', bookingCode: 'BK-0012', user: { id: '42', userCode: 'ST-0042' }, classroom: { id: '7' }, adminNote: 'Reviewed' }])
    expect(http.last()).toMatchObject({ url: '/admin/dashboard/recent-bookings', params: { limit: 8 } })
  })
  it('filters classrooms and keeps server list metadata', async () => {
    http.reply([apiRoom], { total: 9, page: 2, limit: 5 })
    expect(await adminApi.classrooms({ search: 'A', page: 2, limit: 5 })).toMatchObject({ items: [{ id: '7' }], total: 9, page: 2, limit: 5 })
    expect(http.last()).toMatchObject({ url: '/admin/classrooms', params: { search: 'A', page: 2, limit: 5 } })
  })
  it('loads classroom details with booking history', async () => {
    http.reply({ ...apiRoom, bookings: [booking] })
    expect(await adminApi.classroom('room/a')).toMatchObject({ room: { id: '7' }, bookings: [{ id: '12', status: 'APPROVED' }] })
    expect(http.last().url).toBe('/admin/classrooms/room%2Fa')
  })
  it.each(['create', 'update'] as const)('%s adapts classroom form fields for the API', async (action) => {
    http.reply(apiRoom)
    const room = { ...toRoom(apiRoom), image: '/room-placeholder.svg' }
    if (action === 'create') await adminApi.createClassroom(room)
    else await adminApi.updateClassroom('room/a', room)
    expect(http.last()).toMatchObject({ method: action === 'create' ? 'post' : 'patch', url: action === 'create' ? '/admin/classrooms' : '/admin/classrooms/room%2Fa', body: {
      code: 'A201', name: 'Classroom', building: 'A', floor: '2', capacity: 40,
      equipment: ['Projector', 'Wi-Fi'], imageUrl: null, status: 'ACTIVE',
    } })
    expect(http.last().body).not.toHaveProperty('id')
    expect(http.last().body).not.toHaveProperty('image')
  })
  it('keeps uploaded image URLs and supports room status/deactivation', async () => {
    http.reply(apiRoom)
    await adminApi.createClassroom(toRoom(apiRoom))
    expect(http.last().body).toHaveProperty('imageUrl', apiRoom.imageUrl)
    await adminApi.setClassroomStatus('room/a', 'MAINTENANCE')
    expect(http.last()).toMatchObject({ method: 'patch', url: '/admin/classrooms/room%2Fa/status', body: { status: 'MAINTENANCE' } })
    await adminApi.deactivateClassroom('room/a')
    expect(http.last()).toMatchObject({ method: 'delete', url: '/admin/classrooms/room%2Fa' })
  })
})

describe('admin booking contracts', () => {
  it('translates list status and adapts detail history IDs', async () => {
    http.reply([booking])
    expect((await adminApi.bookings({ status: 'APPROVED' })).items[0]).toMatchObject({ status: 'APPROVED' })
    expect(http.last()).toMatchObject({ url: '/admin/bookings', params: { status: 'CONFIRMED' } })
    http.reply({ ...booking, history: [log, { ...log, id: 5, userId: null, entityId: null, user: null }] })
    expect(await adminApi.booking('booking/a')).toMatchObject({ booking: { id: '12' }, history: [
      { id: '4', userId: '42', entityId: '12', user: { id: '42' } },
      { id: '5', userId: null, entityId: null, user: null },
    ] })
    expect(http.last().url).toBe('/admin/bookings/booking%2Fa')
  })
  it.each([
    ['approve', () => adminApi.approveBooking('booking/a'), undefined],
    ['reject', () => adminApi.rejectBooking('booking/a', 'Exam'), { adminNote: 'Exam' }],
    ['cancel', () => adminApi.cancelBooking('booking/a', 'Maintenance'), { reason: 'Maintenance' }],
    ['start', () => adminApi.startBooking('booking/a'), undefined],
    ['complete', () => adminApi.completeBooking('booking/a'), undefined],
    ['no-show', () => adminApi.noShowBooking('booking/a', 'Absent'), { reason: 'Absent' }],
  ] as const)('sends the %s transition with its specific body', async (action, call, body) => {
    http.reply(booking)
    expect(await call()).toMatchObject({ id: '12', status: 'APPROVED' })
    expect(http.last()).toMatchObject({ method: 'patch', url: `/admin/bookings/booking%2Fa/${action}`, body })
  })
  it('supports a no-show without a reason', async () => {
    http.reply(booking)
    await adminApi.noShowBooking('12')
    expect(http.last().body).toBeUndefined()
  })
})

describe('admin user contracts', () => {
  it('lists users and handles names/roles without the auth adapter role collapse', async () => {
    http.reply([{ ...apiUser, role: 'TEACHER', firstName: 'Teacher', lastName: 'Account' }])
    expect((await adminApi.users({ role: 'TEACHER' })).items).toMatchObject([{ id: '42', role: 'TEACHER', firstName: 'Teacher', lastName: 'Account' }])
    expect(http.last()).toMatchObject({ url: '/admin/users', params: { role: 'TEACHER' } })
    http.reply({ ...apiUser, bookings: [booking] })
    expect(await adminApi.user('user/a')).toMatchObject({ user: { id: '42', firstName: 'Test', lastName: 'User' }, bookings: [{ id: '12' }] })
    expect(http.last().url).toBe('/admin/users/user%2Fa')
  })
  it('creates and updates user data through separate endpoints', async () => {
    http.reply(apiUser)
    const input = { name: 'New User', email: 'new@example.com' }
    await adminApi.createUser({ ...input, password: 'new-password', role: 'STAFF' })
    expect(http.last()).toMatchObject({ method: 'post', url: '/admin/users', body: { ...input, password: 'new-password', role: 'STAFF' } })
    await adminApi.updateUser('user/a', input)
    expect(http.last()).toMatchObject({ method: 'patch', url: '/admin/users/user%2Fa', body: input })
  })
  it('changes user roles and statuses, resets passwords, and deactivates accounts', async () => {
    http.reply(apiUser)
    await adminApi.setUserRole('user/a', 'STAFF')
    expect(http.last()).toMatchObject({ method: 'patch', url: '/admin/users/user%2Fa/role', body: { role: 'STAFF' } })
    await adminApi.setUserStatus('user/a', 'SUSPENDED')
    expect(http.last()).toMatchObject({ method: 'patch', url: '/admin/users/user%2Fa/status', body: { status: 'SUSPENDED' } })
    http.reply(null)
    await expect(adminApi.resetUserPassword('user/a', 'new-password')).resolves.toBeNull()
    expect(http.last()).toMatchObject({ method: 'patch', url: '/admin/users/user%2Fa/reset-password', body: { newPassword: 'new-password' } })
    http.reply(apiUser)
    await adminApi.deactivateUser('user/a')
    expect(http.last()).toMatchObject({ method: 'delete', url: '/admin/users/user%2Fa' })
  })
})

describe('admin reporting contracts', () => {
  const filters = { status: 'APPROVED' as const, startDate: '2026-10-20', endDate: '2026-10-26', building: 'A', userRole: 'STAFF' as const }
  it('maps summary pie statuses and preserves the graph and raw byStatus contract', async () => {
    http.reply(report)
    expect(await adminApi.reportsSummary()).toMatchObject({ bookingsGraph: report.bookingsGraph, byStatus: report.byStatus, statusPie: { data: [{ status: 'APPROVED', count: 2 }] } })
    expect(http.last().url).toBe('/admin/reports/summary')
  })
  it('requests booking reports with translated status and adapts result rows', async () => {
    http.reply({ total: 1, byStatus: report.byStatus, rows: [booking] })
    expect(await adminApi.reportsBookings(filters)).toMatchObject({ total: 1, rows: [{ id: '12', status: 'APPROVED' }] })
    expect(http.last()).toMatchObject({ url: '/admin/reports/bookings', params: { ...filters, status: 'CONFIRMED' } })
  })
  it('adapts classroom and user aggregates, including deleted users', async () => {
    http.reply([{ classroom: apiRoom, bookingCount: 3, totalHours: 4 }])
    expect(await adminApi.reportsClassrooms(filters)).toMatchObject([{ classroom: { id: '7' }, bookingCount: 3, totalHours: 4 }])
    expect(http.last()).toMatchObject({ url: '/admin/reports/classrooms', params: { ...filters, status: 'CONFIRMED' } })
    http.reply([{ user: apiUser, bookingCount: 2 }, { user: null, bookingCount: 1 }])
    expect(await adminApi.reportsUsers(filters)).toMatchObject([{ user: { id: '42' } }, { user: null }])
    expect(http.last()).toMatchObject({ url: '/admin/reports/users', params: { ...filters, status: 'CONFIRMED' } })
  })
  it('returns the CSV Blob without treating it as a JSON envelope', async () => {
    const blob = new Blob(['booking,status\n12,CONFIRMED'], { type: 'text/csv' })
    http.raw(blob)
    expect(await adminApi.exportBookings(filters)).toBe(blob)
    expect(http.last()).toMatchObject({ url: '/admin/reports/export', params: { ...filters, status: 'CONFIRMED' } })
  })
  it('filters audit logs and handles missing list metadata', async () => {
    http.reply([log])
    expect(await adminApi.auditLogs({ action: 'UPDATE', entity: 'BOOKING' })).toMatchObject({ items: [{ id: '4', userId: '42' }], total: 0, page: 1, limit: 20 })
    expect(http.last()).toMatchObject({ url: '/admin/audit-logs', params: { action: 'UPDATE', entity: 'BOOKING' } })
  })
  it('rejects unsuccessful admin operations', async () => {
    http.raw({ success: false, data: null, message: 'Transition not allowed' })
    await expect(adminApi.approveBooking('12')).rejects.toThrow('Transition not allowed')
  })
  it('formats dates using the configured test timezone', () => {
    expect(adminDate('2026-10-26T18:00:00Z')).toBe('2026-10-27')
  })
})

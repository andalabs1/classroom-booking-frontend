import { beforeEach, describe, expect, it } from 'vitest'
import { notificationsApi } from '../../../src/shared/api/notifications'
import { clients, httpStub, resetSessions } from '../../helpers/http'
import { sessionUser } from '../../helpers/fixtures'
import { useAdminAuth, useUserAuth } from '../../../src/shared/stores/authStore'

const userHttp = httpStub(clients.user)
const adminHttp = httpStub(clients.admin)
const notification = {
  id: 1, userId: 42, bookingId: 12, title: 'Booking update', message: 'Request received',
  type: 'BOOKING_CREATED', isRead: false, readAt: null, createdAt: '2026-10-26T00:00:00Z',
}
beforeEach(() => {
  resetSessions()
  useUserAuth.getState().setSession(sessionUser, 'user-token')
  useAdminAuth.getState().setSession({ ...sessionUser, role: 'ADMIN' }, 'admin-token')
})
describe('notification API contracts', () => {
  it.each(['user', 'admin'] as const)('loads notifications using the %s session', async (portal) => {
    const http = portal === 'admin' ? adminHttp : userHttp
    http.reply([notification], { total: 3 })
    expect(await notificationsApi.list(portal, { isRead: false, page: 1, limit: 10 })).toMatchObject({ total: 3, items: [{ id: '1', userId: '42', bookingId: '12', kind: 'BOOKING', readAt: null }] })
    expect(http.last()).toMatchObject({ url: '/notifications', params: { isRead: 'false', page: 1, limit: 10 } })
    expect(http.last().headers.get('Authorization')).toBe(`Bearer ${portal}-token`)
  })
  it.each([
    ['BOOKING_REMINDER', 'REMINDER'], ['BOOKING_REJECTED', 'REJECTED'],
    ['BOOKING_CANCELLED', 'CANCELLED'], ['BOOKING_CONFIRMED', 'APPROVED'],
    ['BOOKING_APPROVED', 'APPROVED'], ['SYSTEM', 'BOOKING'],
  ])('maps %s to %s', async (type, kind) => {
    userHttp.reply([{ ...notification, type, bookingId: null }])
    expect((await notificationsApi.list('user')).items[0]).toMatchObject({ kind, bookingId: null })
    expect(userHttp.last().params).not.toHaveProperty('isRead')
  })
  it('serializes the true read filter', async () => {
    userHttp.reply([])
    await notificationsApi.list('user', { isRead: true })
    expect(userHttp.last().params).toEqual({ isRead: 'true' })
  })
  it.each(['user', 'admin'] as const)('counts and marks notifications for %s', async (portal) => {
    const http = portal === 'admin' ? adminHttp : userHttp
    http.reply({ count: 2 })
    expect(await notificationsApi.unreadCount(portal)).toBe(2)
    expect(http.last().url).toBe('/notifications/unread-count')
    http.reply({ updated: 2 })
    expect(await notificationsApi.markAllRead(portal)).toEqual({ updated: 2 })
    expect(http.last()).toMatchObject({ method: 'patch', url: '/notifications/read-all' })
    http.reply({ ...notification, isRead: true, readAt: '2026-10-26T01:00:00Z' })
    expect(await notificationsApi.markRead(portal, 'notification/a')).toMatchObject({ readAt: '2026-10-26T01:00:00Z' })
    expect(http.last()).toMatchObject({ method: 'patch', url: '/notifications/notification%2Fa/read' })
  })
  it('rejects failed read operations', async () => {
    userHttp.raw({ success: false, data: null, message: 'Not your notification' })
    await expect(notificationsApi.markRead('user', '1')).rejects.toThrow('Not your notification')
  })
})

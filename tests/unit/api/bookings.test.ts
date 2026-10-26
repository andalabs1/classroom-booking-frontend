import { describe, expect, it } from 'vitest'
import { bookingsApi, toBooking } from '../../../src/shared/api/bookings'
import { apiBooking, draft } from '../../helpers/fixtures'
import { clients, httpStub } from '../../helpers/http'

const http = httpStub(clients.user)

describe('booking API contracts', () => {
  it('adapts backend IDs, Bangkok timestamps, status and nested room', () => {
    expect(toBooking(apiBooking)).toMatchObject({
      id: '12', userId: '42', roomId: '7', date: '2026-10-27', start: '09:00', end: '10:00',
      attendees: 10, equipment: ['Projector'], note: 'Bring laptop', status: 'APPROVED', room: { id: '7' },
    })
  })
  it('handles absent fields and chooses a cancellation reason before the admin note', () => {
    expect(toBooking({ ...apiBooking, requestedEquipment: null, description: null, classroom: undefined, cancelReason: 'Cancelled', adminNote: 'Reviewed' })).toMatchObject({ equipment: [], note: '', room: undefined, reason: 'Cancelled' })
    expect(toBooking({ ...apiBooking, adminNote: 'Reviewed' }).reason).toBe('Reviewed')
  })
  it.each(['PENDING', 'IN_USE', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const)('preserves %s', (status) => {
    expect(toBooking({ ...apiBooking, status }).status).toBe(status)
  })
  it('translates status filters and calendar metadata without changing the caller filters', async () => {
    http.reply([apiBooking], { total: 4, page: 2, limit: 3, view: 'weekly', startAt: apiBooking.startAt, endAt: apiBooking.endAt })
    const filters = { status: 'APPROVED' as const, page: 2, limit: 3, view: 'weekly' as const, date: '2026-10-27' }
    const result = await bookingsApi.list(filters)
    expect(http.last()).toMatchObject({ url: '/bookings', params: { ...filters, status: 'CONFIRMED' } })
    expect(filters.status).toBe('APPROVED')
    expect(result).toMatchObject({ total: 4, calendar: { view: 'weekly', date: '2026-10-27' }, items: [{ status: 'APPROVED' }] })
  })
  it('returns an empty list without inventing calendar metadata', async () => {
    http.reply([])
    expect(await bookingsApi.list()).toEqual({ items: [], total: 0, page: 1, limit: 20, calendar: undefined })
  })
  it.each(['create', 'update'] as const)('%s sends only API fields with an explicit +07:00 offset', async (action) => {
    http.reply(apiBooking)
    const value = { ...draft, editingId: 'booking/a' }
    if (action === 'create') await bookingsApi.create(value)
    else await bookingsApi.update('booking/a', value)
    expect(http.last()).toMatchObject({ method: action === 'create' ? 'post' : 'patch', url: action === 'create' ? '/bookings' : '/bookings/booking%2Fa', body: {
      classroomId: '7', purpose: draft.purpose, attendeeCount: 10, requestedEquipment: ['Projector'],
      description: 'Bring laptop', startAt: '2026-10-27T09:00:00+07:00', endAt: '2026-10-27T10:00:00+07:00',
    } })
    expect(http.last().body).not.toHaveProperty('editingId')
  })
  it('omits empty descriptions', async () => {
    http.reply(apiBooking)
    await bookingsApi.create({ ...draft, note: '' })
    expect(http.last().body).not.toHaveProperty('description')
  })
  it.each([
    ['get', 'get', '/bookings/booking%2Fa'],
    ['remove', 'delete', '/bookings/booking%2Fa'],
    ['cancel', 'patch', '/bookings/booking%2Fa/cancel'],
    ['checkIn', 'post', '/bookings/booking%2Fa/check-in'],
  ] as const)('%s uses its own endpoint', async (action, method, url) => {
    http.reply(apiBooking)
    expect((await bookingsApi[action]('booking/a')).id).toBe('12')
    expect(http.last()).toMatchObject({ method, url })
  })
  it.each(['remove', 'cancel'] as const)('%s sends the optional reason in the body', async (action) => {
    http.reply(apiBooking)
    await bookingsApi[action]('12', 'Change of plan')
    expect(http.last().body).toEqual({ reason: 'Change of plan' })
  })
  it('surfaces save conflicts instead of returning a booking', async () => {
    http.raw({ success: false, message: 'Time conflict', data: null })
    await expect(bookingsApi.create(draft)).rejects.toThrow('Time conflict')
  })
})

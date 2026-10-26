import { describe, expect, it } from 'vitest'
import { classroomsApi, toRoom } from '../../../src/shared/api/classrooms'
import { apiRoom } from '../../helpers/fixtures'
import { clients, httpStub } from '../../helpers/http'

const http = httpStub(clients.public)
const range = { startAt: '2026-10-27T09:00:00+07:00', endAt: '2026-10-27T10:00:00+07:00' }

describe('classroom API contracts', () => {
  it('normalizes IDs, floors and optional fields', () => {
    expect(toRoom({ ...apiRoom, code: null, description: null, category: null, equipment: null, imageUrl: null })).toMatchObject({
      id: '7', floor: 2, code: '-', description: 'ไม่มีรายละเอียดห้องเรียน', category: 'ห้องเรียน', equipment: [], image: '/room-placeholder.svg',
    })
    expect(toRoom({ ...apiRoom, equipment: ['Projector', 1] }).equipment).toEqual(['Projector', '1'])
  })
  it('forwards list filters and keeps server pagination', async () => {
    http.reply([apiRoom], { page: 2, limit: 5, total: 11 })
    const filters = { search: 'Lab', floor: 2, page: 2, limit: 5 }
    expect(await classroomsApi.list(filters)).toMatchObject({ items: [{ id: '7' }], page: 2, limit: 5, total: 11 })
    expect(http.last()).toMatchObject({ method: 'get', url: '/classrooms', params: filters })
  })
  it('uses requested pagination when meta is absent', async () => {
    http.reply([])
    expect(await classroomsApi.list({ page: 3, limit: 9 })).toEqual({ items: [], total: 0, page: 3, limit: 9 })
  })
  it('encodes classroom IDs in detail and availability URLs', async () => {
    http.reply(apiRoom)
    expect((await classroomsApi.get('room/a')).id).toBe('7')
    expect(http.last().url).toBe('/classrooms/room%2Fa')
    http.reply({ available: false })
    expect(await classroomsApi.availabilityForRoom('room/a', range)).toEqual({ available: false })
    expect(http.last()).toMatchObject({ url: '/classrooms/room%2Fa/availability', params: range })
  })
  it('joins selected room IDs and preserves availability/conflicts', async () => {
    const conflicts = [{ id: 1, classroomId: 7, ...range, status: 'PENDING' }]
    http.reply({ ...range, rooms: [{ ...apiRoom, available: false, conflicts }] })
    expect((await classroomsApi.availability({ ...range, classroomIds: ['7', '8'] })).rooms[0]).toMatchObject({ id: '7', available: false, conflicts })
    expect(http.last()).toMatchObject({ url: '/classrooms/availability', params: { ...range, classroomIds: '7,8' } })
  })
  it('omits empty classroom IDs and adapts all schedule statuses', async () => {
    http.reply({ ...range, rooms: [{ ...apiRoom, bookings: ['PENDING', 'CONFIRMED', 'IN_USE'].map((status, id) => ({ id, classroomId: 7, ...range, status })) }] })
    const schedule = await classroomsApi.schedule({ ...range, classroomIds: [] })
    expect(http.last()).toMatchObject({ url: '/classrooms/schedule', params: range })
    expect(schedule.rooms[0]?.bookings.map((b) => [b.id, b.classroomId, b.status])).toEqual([
      ['0', '7', 'PENDING'], ['1', '7', 'APPROVED'], ['2', '7', 'APPROVED'],
    ])
  })
  it('does not turn an unsuccessful response into an empty catalogue', async () => {
    http.raw({ success: false, data: [], message: 'Rooms unavailable' })
    await expect(classroomsApi.list()).rejects.toThrow('Rooms unavailable')
  })
})

import { QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as queries from '../../../src/shared/hooks/queries'
import { clients, httpStub, resetSessions } from '../../helpers/http'
import { apiBooking, apiRoom, apiUser, rules } from '../../helpers/fixtures'
import { renderQueryHook } from '../../helpers/hooks'

const messages = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('antd', () => ({ App: { useApp: () => ({ message: messages }) } }))
const publicHttp = httpStub(clients.public)
const userHttp = httpStub(clients.user)
const adminHttp = httpStub(clients.admin)
const range = { startAt: apiBooking.startAt, endAt: apiBooking.endAt, classroomIds: ['7'] }
const summary = {
  users: 1, classrooms: 1, bookings: 1, byStatus: [],
  bookingsGraph: { timezone: 'Asia/Bangkok', startDate: '2026-10-20', endDate: '2026-10-26', data: [] },
  statusPie: { total: 1, data: [] },
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 10_000 }, mutations: { retry: false } } })
  messages.success.mockReset()
  messages.error.mockReset()
  resetSessions()
})
afterEach(() => client.clear())

type QueryCase = {
  name: string
  useHook: () => UseQueryResult<unknown, Error>
  key: readonly unknown[]
  transport: 'public' | 'user' | 'admin'
  data: unknown
  url: string
}
const cases: QueryCase[] = [
  { name: 'useClassrooms', useHook: () => queries.useClassrooms({ search: 'A' }), key: ['classrooms', { search: 'A' }], transport: 'public', data: [apiRoom], url: '/classrooms' },
  { name: 'useClassroom', useHook: () => queries.useClassroom('7'), key: ['classrooms', '7'], transport: 'public', data: apiRoom, url: '/classrooms/7' },
  { name: 'useClassroomsAvailability', useHook: () => queries.useClassroomsAvailability(range), key: ['classrooms', 'availability', range], transport: 'public', data: { ...range, rooms: [] }, url: '/classrooms/availability' },
  { name: 'useClassroomSchedule', useHook: () => queries.useClassroomSchedule(range), key: ['classrooms', 'schedule', range], transport: 'public', data: { ...range, rooms: [] }, url: '/classrooms/schedule' },
  { name: 'useBookings', useHook: () => queries.useBookings({ status: 'APPROVED' }), key: ['bookings', { status: 'APPROVED' }], transport: 'user', data: [apiBooking], url: '/bookings' },
  { name: 'useBooking', useHook: () => queries.useBooking('12'), key: ['bookings', '12'], transport: 'user', data: apiBooking, url: '/bookings/12' },
  { name: 'useNotifications', useHook: () => queries.useNotifications('user', { limit: 10 }), key: ['notifications', 'user', { limit: 10 }], transport: 'user', data: [], url: '/notifications' },
  { name: 'useUnreadNotificationCount', useHook: () => queries.useUnreadNotificationCount('admin'), key: ['notifications', 'admin', 'unread-count'], transport: 'admin', data: { count: 2 }, url: '/notifications/unread-count' },
  { name: 'useMyProfile', useHook: () => queries.useMyProfile(), key: ['users', 'me'], transport: 'user', data: apiUser, url: '/users/me' },
  { name: 'useMyBookings', useHook: () => queries.useMyBookings(), key: ['users', 'me', 'bookings'], transport: 'user', data: [apiBooking], url: '/users/me/bookings' },
  { name: 'useBusinessRules', useHook: () => queries.useBusinessRules(), key: ['config', 'business-rules'], transport: 'user', data: rules, url: '/config/business-rules' },
  { name: 'useAdminDashboard', useHook: () => queries.useAdminDashboard(), key: ['admin', 'dashboard'], transport: 'admin', data: { mostBookedClassroom: null }, url: '/admin/dashboard/summary' },
  { name: 'useAdminReportSummary', useHook: () => queries.useAdminReportSummary(), key: ['admin', 'reports', 'summary'], transport: 'admin', data: summary, url: '/admin/reports/summary' },
  { name: 'useAdminRecentBookings', useHook: () => queries.useAdminRecentBookings(), key: ['admin', 'recent-bookings'], transport: 'admin', data: [apiBooking], url: '/admin/dashboard/recent-bookings' },
  { name: 'useAdminClassrooms', useHook: () => queries.useAdminClassrooms({ building: 'A' }), key: ['admin', 'classrooms', { building: 'A' }], transport: 'admin', data: [apiRoom], url: '/admin/classrooms' },
  { name: 'useAdminClassroom', useHook: () => queries.useAdminClassroom('7'), key: ['admin', 'classrooms', '7'], transport: 'admin', data: { ...apiRoom, bookings: [] }, url: '/admin/classrooms/7' },
  { name: 'useAdminBookings', useHook: () => queries.useAdminBookings({ status: 'PENDING' }, { live: true }), key: ['admin', 'bookings', { status: 'PENDING' }], transport: 'admin', data: [apiBooking], url: '/admin/bookings' },
  { name: 'useAdminBooking', useHook: () => queries.useAdminBooking('12'), key: ['admin', 'bookings', '12'], transport: 'admin', data: { ...apiBooking, history: [] }, url: '/admin/bookings/12' },
  { name: 'useAdminUsers', useHook: () => queries.useAdminUsers({ role: 'STAFF' }), key: ['admin', 'users', { role: 'STAFF' }], transport: 'admin', data: [apiUser], url: '/admin/users' },
  { name: 'useAdminUser', useHook: () => queries.useAdminUser('42'), key: ['admin', 'users', '42'], transport: 'admin', data: { ...apiUser, bookings: [] }, url: '/admin/users/42' },
  { name: 'useAuditLogs', useHook: () => queries.useAuditLogs({ entity: 'USER' }), key: ['admin', 'audit-logs', { entity: 'USER' }], transport: 'admin', data: [], url: '/admin/audit-logs' },
]

describe('query hooks with the real QueryClient and API adapters', () => {
  it.each(cases)('$name fetches into its own cache entry', async ({ useHook, key, transport, data, url }) => {
    const http = transport === 'public' ? publicHttp : transport === 'admin' ? adminHttp : userHttp
    http.reply(data)
    const result = renderQueryHook<UseQueryResult<unknown, Error>>(client, useHook)
    expect(result.isEnabled).toBe(true)
    const fetched = await result.refetch()
    expect(fetched.error).toBeNull()
    expect(client.getQueryData(key)).toEqual(fetched.data)
    expect(http.last().url).toBe(url)
  })
  it.each([
    { name: 'room detail', useHook: () => queries.useClassroom(undefined) },
    { name: 'booking detail', useHook: () => queries.useBooking(undefined) },
    { name: 'availability without range', useHook: () => queries.useClassroomsAvailability(undefined) },
    { name: 'availability without IDs', useHook: () => queries.useClassroomsAvailability({ ...range, classroomIds: [] }) },
    { name: 'schedule without range', useHook: () => queries.useClassroomSchedule(undefined) },
    { name: 'schedule without IDs', useHook: () => queries.useClassroomSchedule({ ...range, classroomIds: [] }) },
    { name: 'admin room', useHook: () => queries.useAdminClassroom(undefined) },
    { name: 'admin booking', useHook: () => queries.useAdminBooking(undefined) },
    { name: 'admin user', useHook: () => queries.useAdminUser(undefined) },
  ])('disables $name until its input exists', ({ useHook }) => {
    expect(renderQueryHook<UseQueryResult<unknown, Error>>(client, useHook).isEnabled).toBe(false)
    expect(publicHttp.requests).toHaveLength(0)
    expect(userHttp.requests).toHaveLength(0)
    expect(adminHttp.requests).toHaveLength(0)
  })
  it('keeps filtered catalogue cache entries separate', async () => {
    publicHttp.reply([apiRoom])
    await renderQueryHook(client, () => queries.useClassrooms({ building: 'A' })).refetch()
    publicHttp.reply([])
    await renderQueryHook(client, () => queries.useClassrooms({ building: 'B' })).refetch()
    expect(client.getQueryData(['classrooms', { building: 'A' }])).toMatchObject({ items: [{ id: '7' }] })
    expect(client.getQueryData(['classrooms', { building: 'B' }])).toMatchObject({ items: [] })
  })
  it('separates user and admin notification caches', async () => {
    userHttp.reply({ count: 2 })
    adminHttp.reply({ count: 5 })
    await renderQueryHook(client, () => queries.useUnreadNotificationCount('user')).refetch()
    await renderQueryHook(client, () => queries.useUnreadNotificationCount('admin')).refetch()
    expect(client.getQueryData(['notifications', 'user', 'unread-count'])).toBe(2)
    expect(client.getQueryData(['notifications', 'admin', 'unread-count'])).toBe(5)
  })
  it('keeps business rules fresh longer than catalogue data', () => {
    client.setQueryData(['config', 'business-rules'], rules, { updatedAt: Date.now() - 60_000 })
    client.setQueryData(['classrooms', {}], { items: [], total: 0, page: 1, limit: 20 }, { updatedAt: Date.now() - 60_000 })
    expect(renderQueryHook(client, () => queries.useBusinessRules()).isStale).toBe(false)
    expect(renderQueryHook(client, () => queries.useClassrooms()).isStale).toBe(true)
  })
  it('exposes API failures through query error state', async () => {
    publicHttp.raw({ success: false, data: null, message: 'Catalogue unavailable' })
    await renderQueryHook(client, () => queries.useClassrooms()).refetch()
    const state = client.getQueryState(['classrooms', {}])
    expect(state?.status).toBe('error')
    expect(state?.error?.message).toBe('Catalogue unavailable')
  })
  it('combines report responses and forwards filters to the applicable endpoints', async () => {
    const filters = { status: 'APPROVED' as const, building: 'A' }
    const original = clients.admin.defaults.adapter
    const paths: string[] = []
    clients.admin.defaults.adapter = async (config) => {
      paths.push(config.url ?? '')
      const data = config.url?.endsWith('/summary') ? summary
        : config.url?.endsWith('/bookings') ? { total: 1, byStatus: [], rows: [apiBooking] }
        : config.url?.endsWith('/classrooms') ? [{ classroom: apiRoom, bookingCount: 1, totalHours: 1 }]
        : [{ user: apiUser, bookingCount: 1 }]
      expect(config.params).toEqual(config.url?.endsWith('/summary') ? undefined : { status: 'CONFIRMED', building: 'A' })
      return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config }
    }
    try {
      const result = await renderQueryHook(client, () => queries.useAdminReports(filters)).refetch()
      expect(paths).toHaveLength(4)
      expect(result.data).toMatchObject({ summary: { bookings: 1 }, bookings: { rows: [{ id: '12' }] }, classrooms: [{ classroom: { id: '7' } }], users: [{ user: { id: '42' } }] })
    } finally { clients.admin.defaults.adapter = original }
  })
  it('fails the aggregate report when an API response fails', async () => {
    adminHttp.raw({ success: false, data: null, message: 'Report unavailable' })
    await renderQueryHook(client, () => queries.useAdminReports()).refetch()
    const state = client.getQueryState(['admin', 'reports', {}])
    expect(state?.status).toBe('error')
    expect(state?.data).toBeUndefined()
    expect(state?.error?.message).toBe('Report unavailable')
  })
})

describe('mutation cache and feedback behavior', () => {
  it('invalidates server data after success, retaining configuration caches', async () => {
    const keys = [['notifications', 'user'], ['bookings', '12'], ['classrooms', {}], ['users', 'me'], ['admin', 'dashboard']]
    for (const key of [...keys, ['config', 'business-rules']]) client.setQueryData(key, 'cached')
    const action = vi.fn(async (id: string) => ({ id, status: 'CANCELLED' }))
    const mutation = renderQueryHook(client, () => queries.useAction(action, 'Cancelled'))
    expect(await mutation.mutateAsync('12')).toEqual({ id: '12', status: 'CANCELLED' })
    expect(action.mock.calls[0]?.[0]).toBe('12')
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    expect(client.getQueryState(['config', 'business-rules'])?.isInvalidated).toBe(false)
    expect(messages.success).toHaveBeenCalledWith('Cancelled')
    expect(messages.error).not.toHaveBeenCalled()
  })
  it('preserves cached data and shows the error when a mutation fails', async () => {
    client.setQueryData(['bookings'], ['original'])
    const failure = new Error('Booking locked')
    const mutation = renderQueryHook(client, () => queries.useAction(async () => { throw failure }, 'Saved'))
    await expect(mutation.mutateAsync(undefined)).rejects.toBe(failure)
    expect(client.getQueryState(['bookings'])?.isInvalidated).toBe(false)
    expect(client.getQueryData(['bookings'])).toEqual(['original'])
    expect(messages.error).toHaveBeenCalledWith('Booking locked')
    expect(messages.success).not.toHaveBeenCalled()
  })
  it('allows a successful action without a success toast', async () => {
    const mutation = renderQueryHook(client, () => queries.useAction(async () => 'done'))
    await expect(mutation.mutateAsync(undefined)).resolves.toBe('done')
    expect(messages.success).not.toHaveBeenCalled()
  })
})

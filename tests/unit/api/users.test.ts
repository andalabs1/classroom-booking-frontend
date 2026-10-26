import { describe, expect, it } from 'vitest'
import { usersApi } from '../../../src/shared/api/users'
import { apiBooking, apiUser, rules } from '../../helpers/fixtures'
import { clients, httpStub } from '../../helpers/http'

const http = httpStub(clients.user)
describe('user API contracts', () => {
  it('loads a profile with its backend identity and name fallback', async () => {
    http.reply(apiUser)
    expect(await usersApi.me()).toMatchObject({ id: '42', userCode: 'ST-0042', name: 'Test User', firstName: 'Test', lastName: 'User', phone: '', role: 'USER' })
    expect(http.last().url).toBe('/users/me')
  })
  it('preserves explicit names and the administrator profile', async () => {
    http.reply({ ...apiUser, userCode: null, firstName: 'Admin', lastName: 'Account', role: 'ADMIN' })
    expect(await usersApi.me()).toMatchObject({ firstName: 'Admin', lastName: 'Account', userCode: null, role: 'ADMIN' })
  })
  it.each([undefined, 'Test'])('searches the directory with %s', async (search) => {
    http.reply([apiUser])
    expect(await usersApi.directory(search)).toMatchObject([{ id: '42' }])
    expect(http.last()).toMatchObject({ url: '/users/directory', params: search ? { search } : undefined })
  })
  it('updates the profile with a derived full name', async () => {
    http.reply(apiUser)
    const input = { firstName: 'Test', lastName: 'User', phone: '0800000000', email: apiUser.email }
    await usersApi.updateMe(input)
    expect(http.last()).toMatchObject({ method: 'patch', url: '/users/me', body: { ...input, name: 'Test User' } })
  })
  it('changes the password without sending a confirmation field', async () => {
    http.reply(null)
    await expect(usersApi.changePassword('current', 'new-password')).resolves.toBeNull()
    expect(http.last()).toMatchObject({ method: 'patch', url: '/users/me/password', body: { currentPassword: 'current', newPassword: 'new-password' } })
  })
  it('adapts personal bookings and their status filters/pagination', async () => {
    http.reply([apiBooking], { total: 6, page: 2, limit: 3 })
    expect(await usersApi.myBookings({ status: 'APPROVED', page: 2, limit: 3 })).toMatchObject({ items: [{ status: 'APPROVED' }], total: 6, page: 2, limit: 3 })
    expect(http.last()).toMatchObject({ url: '/users/me/bookings', params: { status: 'CONFIRMED', page: 2, limit: 3 } })
    http.reply([])
    expect(await usersApi.myBookings()).toEqual({ items: [], total: 0, page: 1, limit: 20 })
  })
  it('loads backend business rules', async () => {
    http.reply(rules)
    expect(await usersApi.businessRules()).toEqual(rules)
    expect(http.last().url).toBe('/config/business-rules')
  })
  it('surfaces unsuccessful profile responses', async () => {
    http.raw({ success: false, message: 'Profile unavailable', data: null })
    await expect(usersApi.me()).rejects.toThrow('Profile unavailable')
  })
})

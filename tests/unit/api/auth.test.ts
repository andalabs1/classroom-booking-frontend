import { beforeEach, describe, expect, it } from 'vitest'
import { authApi } from '../../../src/shared/api/auth'
import { clients, httpStub, resetSessions } from '../../helpers/http'
import { apiUser } from '../../helpers/fixtures'

const publicHttp = httpStub(clients.public)
const userHttp = httpStub(clients.user)
const adminHttp = httpStub(clients.admin)
beforeEach(resetSessions)

describe('auth API contracts', () => {
  it('uses the backend ID and omits passwords when signing in', async () => {
    publicHttp.reply({ token: 'test-token', user: { ...apiUser, password: 'must-not-be-exposed' } })
    const result = await authApi.login({ username: 'test-user', password: 'test-password' })
    expect(result).toEqual({ token: 'test-token', user: {
      id: '42', firstName: 'Test', lastName: 'User', email: apiUser.email,
      phone: '', role: 'USER', status: 'ACTIVE', registeredAt: apiUser.createdAt,
    } })
    expect(publicHttp.last()).toMatchObject({ method: 'post', url: '/auth/login', body: { username: 'test-user', password: 'test-password' } })
  })
  it('preserves explicit names and the administrator role', async () => {
    publicHttp.reply({ token: 'admin-token', user: { ...apiUser, firstName: 'Admin', lastName: 'Account', phone: '0800000000', role: 'ADMIN' } })
    expect((await authApi.login({ username: 'admin', password: 'test' })).user).toMatchObject({ firstName: 'Admin', lastName: 'Account', phone: '0800000000', role: 'ADMIN' })
  })
  it('registers a USER with the backend ID, without creating a local session', async () => {
    publicHttp.reply(apiUser)
    const payload = { firstName: 'Test', lastName: 'User', userCode: 'ST-0042', email: apiUser.email, phone: '0800000000', password: 'test-password' }
    expect((await authApi.register(payload)).id).toBe('42')
    expect(publicHttp.last()).toMatchObject({ method: 'post', url: '/auth/register', body: { ...payload, role: 'USER' } })
  })
  it.each(['user', 'admin'] as const)('logs out using the %s client', async (portal) => {
    const http = portal === 'admin' ? adminHttp : userHttp
    http.reply(null)
    await expect(authApi.logout(portal)).resolves.toBeUndefined()
    expect(http.last()).toMatchObject({ method: 'post', url: '/auth/logout' })
    expect((portal === 'admin' ? userHttp : adminHttp).requests).toHaveLength(0)
  })
  it('surfaces a rejected login envelope', async () => {
    publicHttp.raw({ success: false, message: 'Invalid credentials', data: null })
    await expect(authApi.login({ username: 'test', password: 'wrong' })).rejects.toThrow('Invalid credentials')
  })
})

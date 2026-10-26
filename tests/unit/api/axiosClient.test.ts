import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import { authenticatedClient } from '../../../src/shared/api/axiosClient'
import { clients, httpStub, resetSessions } from '../../helpers/http'
import { sessionUser } from '../../helpers/fixtures'
import { useAdminAuth, useUserAuth } from '../../../src/shared/stores/authStore'

const publicHttp = httpStub(clients.public)
const userHttp = httpStub(clients.user)
const adminHttp = httpStub(clients.admin)
beforeEach(() => {
  resetSessions()
  useUserAuth.getState().setSession(sessionUser, 'user-token')
  useAdminAuth.getState().setSession({ ...sessionUser, role: 'ADMIN' }, 'admin-token')
})

describe('HTTP transport', () => {
  it('sends only the selected portal token, and no token on public calls', async () => {
    for (const http of [publicHttp, userHttp, adminHttp]) http.reply(null)
    await Promise.all([clients.public.get('/public'), clients.user.get('/user'), clients.admin.get('/admin')])
    expect(publicHttp.last().headers.get('Authorization')).toBeUndefined()
    expect(userHttp.last().headers.get('Authorization')).toBe('Bearer user-token')
    expect(adminHttp.last().headers.get('Authorization')).toBe('Bearer admin-token')
    expect(authenticatedClient('user')).toBe(clients.user)
    expect(authenticatedClient('admin')).toBe(clients.admin)
  })
  it('reads the latest token for each request and omits it after logout', async () => {
    userHttp.reply(null)
    useUserAuth.getState().setSession(sessionUser, 'renewed-token')
    await clients.user.get('/profile')
    expect(userHttp.last().headers.get('Authorization')).toBe('Bearer renewed-token')
    useUserAuth.getState().logout()
    await clients.user.get('/profile')
    expect(userHttp.last().headers.get('Authorization')).toBeUndefined()
  })
  it.each(['user', 'admin'] as const)('401 clears only the %s session', async (portal) => {
    const http = portal === 'admin' ? adminHttp : userHttp
    http.raw({ message: 'Session expired' }, 401)
    await expect(clients[portal].get('/private')).rejects.toThrow('Session expired')
    expect((portal === 'admin' ? useAdminAuth : useUserAuth).getState().token).toBeNull()
    expect((portal === 'admin' ? useUserAuth : useAdminAuth).getState().token).not.toBeNull()
  })
  it('a public 401 does not clear either session', async () => {
    publicHttp.raw({ message: 'Invalid credentials' }, 401)
    await expect(clients.public.get('/auth')).rejects.toThrow('Invalid credentials')
    expect(useUserAuth.getState().token).toBe('user-token')
    expect(useAdminAuth.getState().token).toBe('admin-token')
  })
  it.each([
    [403, {}, 'ไม่มีสิทธิ์เข้าถึงข้อมูล'],
    [500, {}, 'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่'],
    [422, { message: ['invalid'] }, 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่'],
    [409, { message: 'Already booked' }, 'Already booked'],
  ] as const)('normalizes HTTP %i', async (status, body, expected) => {
    userHttp.raw(body, status)
    await expect(clients.user.get('/failure')).rejects.toThrow(expected)
  })
  it('normalizes network errors and preserves non-Axios failures', async () => {
    userHttp.fail(new AxiosError('Network Error'))
    await expect(clients.user.get('/offline')).rejects.toThrow('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่')
    const error = new Error('Adapter failed')
    userHttp.fail(error)
    await expect(clients.user.get('/failure')).rejects.toBe(error)
  })
})

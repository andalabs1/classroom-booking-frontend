import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionUser } from '../../helpers/fixtures'

async function freshStores() {
  vi.resetModules()
  return import('../../../src/shared/stores/authStore')
}
afterEach(() => vi.unstubAllGlobals())

describe('portal session persistence', () => {
  it('keeps user/admin sessions isolated in memory and storage', async () => {
    const { useUserAuth, useAdminAuth, getAuthStore } = await freshStores()
    expect(getAuthStore('user')).toBe(useUserAuth)
    expect(getAuthStore('admin')).toBe(useAdminAuth)
    useUserAuth.getState().setSession(sessionUser, 'user-token')
    useAdminAuth.getState().setSession({ ...sessionUser, role: 'ADMIN' }, 'admin-token')
    expect(JSON.parse(localStorage.getItem('classroom-user-auth') ?? 'null').state.token).toBe('user-token')
    expect(JSON.parse(localStorage.getItem('classroom-admin-auth') ?? 'null').state.token).toBe('admin-token')
    useUserAuth.getState().logout()
    expect(useUserAuth.getState()).toMatchObject({ user: null, token: null })
    expect(useAdminAuth.getState().token).toBe('admin-token')
    await useUserAuth.persist.rehydrate()
    expect(useUserAuth.getState().token).toBeNull()
  })
  it('hydrates persisted sessions without losing store actions', async () => {
    localStorage.setItem('classroom-user-auth', JSON.stringify({ state: { user: sessionUser, token: 'persisted-token' }, version: 0 }))
    const { useUserAuth } = await freshStores()
    expect(useUserAuth.getState()).toMatchObject({ user: sessionUser, token: 'persisted-token' })
    useUserAuth.getState().logout()
    expect(useUserAuth.getState().token).toBeNull()
  })
  it.each(['USER', 'ADMIN'] as const)('migrates a legacy %s session only into the matching portal', async (role) => {
    vi.stubGlobal('window', { localStorage })
    localStorage.setItem('classroom-auth', JSON.stringify({ state: { user: { ...sessionUser, role }, token: 'legacy-token' } }))
    const { useUserAuth, useAdminAuth } = await freshStores()
    expect((role === 'ADMIN' ? useAdminAuth : useUserAuth).getState().token).toBe('legacy-token')
    expect((role === 'ADMIN' ? useUserAuth : useAdminAuth).getState().token).toBeNull()
  })
  it('prefers an explicitly logged-out new session over a legacy login', async () => {
    vi.stubGlobal('window', { localStorage })
    localStorage.setItem('classroom-auth', JSON.stringify({ state: { user: sessionUser, token: 'legacy-token' } }))
    localStorage.setItem('classroom-user-auth', JSON.stringify({ state: { user: null, token: null }, version: 0 }))
    const { useUserAuth } = await freshStores()
    expect(useUserAuth.getState().token).toBeNull()
  })
  it.each(['invalid json', JSON.stringify({ state: { user: sessionUser, token: null } })])('ignores an unusable legacy session', async (value) => {
    vi.stubGlobal('window', { localStorage })
    localStorage.setItem('classroom-auth', value)
    const { useUserAuth, useAdminAuth } = await freshStores()
    expect(useUserAuth.getState().user).toBeNull()
    expect(useAdminAuth.getState().user).toBeNull()
  })
})

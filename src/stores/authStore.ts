import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

export type AuthPortal = 'user' | 'admin'

type AuthState = {
  user: User | null
  token: string | null
  setSession: (user: User, token: string) => void
  logout: () => void
}

const LEGACY_AUTH_KEY = 'classroom-auth'

function legacySession(portal: AuthPortal): Pick<AuthState, 'user' | 'token'> | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const stored = JSON.parse(localStorage.getItem(LEGACY_AUTH_KEY) || 'null') as {
      state?: Pick<AuthState, 'user' | 'token'>
    } | null
    const session = stored?.state
    const roleMatchesPortal = portal === 'admin' ? session?.user?.role === 'ADMIN' : session?.user?.role !== 'ADMIN'
    return session?.user && session.token && roleMatchesPortal ? session : undefined
  } catch {
    return undefined
  }
}

function createAuthStore(name: string, legacyPortal?: AuthPortal) {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        token: null,
        setSession: (user, token) => set({ user, token }),
        logout: () => set({ user: null, token: null }),
      }),
      {
        name,
        merge: (persistedState, currentState) => {
          const session = persistedState as Partial<AuthState> | undefined
          if (session) return { ...currentState, ...session }

          const previousSession = legacyPortal ? legacySession(legacyPortal) : undefined
          return previousSession ? { ...currentState, ...previousSession } : currentState
        },
      },
    ),
  )
}

export const useUserAuth = createAuthStore('classroom-user-auth', 'user')
export const useAdminAuth = createAuthStore('classroom-admin-auth', 'admin')

const authStores = {
  user: useUserAuth,
  admin: useAdminAuth,
} as const

export function getAuthStore(portal: AuthPortal) {
  return authStores[portal]
}

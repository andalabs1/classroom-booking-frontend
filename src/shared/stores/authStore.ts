import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/index'

export type AuthPortal = 'user' | 'admin'

type AuthState = {
  user: User | null
  token: string | null
  setSession: (user: User, token: string) => void
  logout: () => void
}

const LEGACY_AUTH_KEY = 'classroom-auth'

/**
 * อ่าน session จาก storage key รุ่นเก่า และเลือกใช้เฉพาะบัญชีที่ role ตรงกับ portal
 * คืน undefined หากข้อมูลเสีย ไม่มี token หรืออยู่นอก browser
 */
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

/**
 * สร้าง Zustand auth store ที่ persist user/token แยกตามชื่อ storage key
 * หากไม่มี persisted state ใหม่ จะลองอ่าน session เดิมของ portal ที่กำหนด
 */
function createAuthStore(name: string, legacyPortal?: AuthPortal) {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        token: null,
        /**
         * อัปเดต user/token พร้อมกันและให้ persist middleware บันทึก session ของ portal นี้
         */
        setSession: (user, token) => set({ user, token }),
        /**
         * ล้าง user/token เฉพาะ local store นี้; การเพิกถอน JWT ที่ backend ต้องเรียก authApi.logout
         */
        logout: () => set({ user: null, token: null }),
      }),
      {
        name,
        /**
         * รวม persisted state กับ actions ปัจจุบัน; ใช้ legacy session เฉพาะเมื่อยังไม่มี persisted state ใหม่
         */
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

/** Session ของหน้าผู้ใช้ แยก storage และสถานะออกจากหน้าจัดการ admin */
export const useUserAuth = createAuthStore('classroom-user-auth', 'user')
/** Session ของหน้า admin ซึ่ง HTTP client และ permission guard เลือกใช้ตาม portal */
export const useAdminAuth = createAuthStore('classroom-admin-auth', 'admin')

const authStores = {
  user: useUserAuth,
  admin: useAdminAuth,
} as const

/**
 * คืน store ของ portal สำหรับใช้ทั้งใน component และผ่าน getState ใน HTTP interceptor
 */
export function getAuthStore(portal: AuthPortal) {
  return authStores[portal]
}

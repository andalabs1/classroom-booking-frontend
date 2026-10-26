import { authenticatedClient, publicAxiosClient } from './axiosClient'
import type { AuthPortal } from '../stores/authStore'
import type { ApiResponse } from './types'
import type { User } from '../types/index'

type AuthApiUser = {
  id: string | number
  userCode?: string | null
  name: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email: string
  role: string
  status: User['status']
  createdAt: string
}

type LoginPayload = {
  username: string
  password: string
}

type RegisterPayload = {
  firstName: string
  lastName: string
  userCode: string
  email: string
  phone: string
  password: string
}

type LoginResult = {
  token: string
  user: AuthApiUser
}

/**
 * แปลงบัญชี API เป็น User ของ UI โดยใช้ database ID เป็น string และแยกชื่อเมื่อไม่มี firstName/lastName
 * คง ADMIN ไว้ ส่วน role อื่นรวมเป็น USER ตามรูปแบบสิทธิ์ของ frontend
 */
function asUser(user: AuthApiUser): User {
  const nameParts = user.name.trim().split(/\s+/)
  return {
    id: String(user.id),
    firstName: user.firstName ?? nameParts[0] ?? '',
    lastName: user.lastName ?? nameParts.slice(1).join(' '),
    email: user.email,
    phone: user.phone ?? '',
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    status: user.status,
    registeredAt: user.createdAt,
  }
}

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

export const authApi = {
  /**
   * สมัครบัญชีผ่าน public client โดยระบุ role USER และคืนโปรไฟล์ที่แปลงสำหรับ UI
   */
  async register(payload: RegisterPayload): Promise<User> {
    const response = await publicAxiosClient.post<ApiResponse<AuthApiUser>>('/auth/register', { ...payload, role: 'USER' })
    return asUser(dataOrThrow(response.data))
  },

  /**
   * ส่ง username/password แล้วคืน token และ User; caller เป็นผู้เลือก portal และเก็บ session
   */
  async login(payload: LoginPayload): Promise<{ token: string; user: User }> {
    const response = await publicAxiosClient.post<ApiResponse<LoginResult>>('/auth/login', payload)
    const result = dataOrThrow(response.data)
    return { token: result.token, user: asUser(result.user) }
  },

  /**
   * แจ้ง backend ให้เพิกถอน token ผ่าน client ของ portal ที่ระบุ
   * caller ต้องล้าง auth store ของ portal ต่อเพื่ออัปเดตสถานะใน browser
   */
  async logout(portal: AuthPortal): Promise<void> {
    const response = await authenticatedClient(portal).post<ApiResponse<null>>('/auth/logout')
    dataOrThrow(response.data)
  },
}

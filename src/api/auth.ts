import { authenticatedClient, publicAxiosClient } from './axiosClient'
import type { AuthPortal } from '../stores/authStore'
import type { ApiResponse } from './types'
import type { User } from '../types'

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

function asUser(user: AuthApiUser): User {
  const nameParts = user.name.trim().split(/\s+/)
  return {
    // Other frontend features still use the local demo data keyed by user code.
    // Prefer it when available so the existing demo accounts keep working there.
    id: user.userCode ?? String(user.id),
    firstName: user.firstName ?? nameParts[0] ?? '',
    lastName: user.lastName ?? nameParts.slice(1).join(' '),
    email: user.email,
    phone: user.phone ?? '',
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    status: user.status,
    registeredAt: user.createdAt,
  }
}

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<User> {
    const response = await publicAxiosClient.post<ApiResponse<AuthApiUser>>('/auth/register', { ...payload, role: 'USER' })
    return asUser(dataOrThrow(response.data))
  },

  async login(payload: LoginPayload): Promise<{ token: string; user: User }> {
    const response = await publicAxiosClient.post<ApiResponse<LoginResult>>('/auth/login', payload)
    const result = dataOrThrow(response.data)
    return { token: result.token, user: asUser(result.user) }
  },

  async logout(portal: AuthPortal): Promise<void> {
    const response = await authenticatedClient(portal).post<ApiResponse<null>>('/auth/logout')
    dataOrThrow(response.data)
  },
}

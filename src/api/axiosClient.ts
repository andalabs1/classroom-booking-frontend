import axios from 'axios'
import { getAuthStore, type AuthPortal } from '../stores/authStore'

const clientConfig = {
  baseURL:
    import.meta.env.VITE_API_BASE_URL || 'https://classroom-booking-backend.vercel.app/api',
  timeout: 15000,
}

function apiError(error: unknown, portal?: AuthPortal) {
  if (!axios.isAxiosError(error)) return Promise.reject(error)

  const status = error.response?.status
  if (status === 401 && portal) getAuthStore(portal).getState().logout()
  const apiMessage = error.response?.data?.message
  const message =
    typeof apiMessage === 'string'
      ? apiMessage
      : status === 403
        ? 'ไม่มีสิทธิ์เข้าถึงข้อมูล'
        : status && status >= 500
          ? 'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่'
          : 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่'
  return Promise.reject(new Error(message))
}

function createAuthenticatedClient(portal: AuthPortal) {
  const client = axios.create(clientConfig)
  client.interceptors.request.use((config) => {
    const token = getAuthStore(portal).getState().token
    if (token && !token.startsWith('mock-')) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => apiError(error, portal),
  )
  return client
}

export const publicAxiosClient = axios.create(clientConfig)
publicAxiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => apiError(error),
)

export const userAxiosClient = createAuthenticatedClient('user')
export const adminAxiosClient = createAuthenticatedClient('admin')

export function authenticatedClient(portal: AuthPortal) {
  return portal === 'admin' ? adminAxiosClient : userAxiosClient
}

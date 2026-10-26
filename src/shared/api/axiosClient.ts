import axios from 'axios'
import { getAuthStore, type AuthPortal } from '../stores/authStore'

const clientConfig = {
  baseURL:
    import.meta.env.VITE_API_BASE_URL || 'https://classroom-booking-backend.vercel.app/api',
  timeout: 15000,
}

/**
 * แปลง Axios error เป็นข้อความสำหรับ UI และล้าง session เฉพาะ portal ที่ได้รับ 401
 * คืน rejected Promise; public client ไม่ผูก session จึงไม่ logout ผู้ใช้เมื่อเรียก public API ล้มเหลว
 */
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

/**
 * สร้าง Axios client ที่อ่าน token ล่าสุดของ portal ก่อนส่งทุก request
 * ผูก response interceptor ให้จัดการ error และ session ของ portal เดียวกัน
 */
function createAuthenticatedClient(portal: AuthPortal) {
  const client = axios.create(clientConfig)
  client.interceptors.request.use((config) => {
    const token = getAuthStore(portal).getState().token
    if (token) {
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

/**
 * เลือก HTTP client ของ user/admin เพื่อให้ token ของทั้งสอง portal แยกกัน
 */
export function authenticatedClient(portal: AuthPortal) {
  return portal === 'admin' ? adminAxiosClient : userAxiosClient
}

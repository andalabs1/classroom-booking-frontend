import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthStore } from '../../stores/authStore'
import type { Role } from '../../types/index'
/**
 * เลือก session ตาม role ของเส้นทาง แล้วพาไป login พร้อมเก็บ path/query หากยังไม่เข้าสู่ระบบ
 * เมื่อ role ไม่ตรงส่งไป /403; guard ควบคุมการแสดงหน้า ส่วนสิทธิ์ API ตรวจที่ backend
 */
export function PermissionGuard({ children, role }: { children: ReactNode; role?: Role }) {
  const authStore = getAuthStore(role === 'ADMIN' ? 'admin' : 'user')
  const user = authStore((s) => s.user)
  const location = useLocation()
  if (!user) return <Navigate to={role === 'ADMIN' ? '/admin/login' : '/login'} state={{ from: location.pathname + location.search }} replace />
  if (role && user.role !== role) return <Navigate to="/403" replace />
  return <>{children}</>
}

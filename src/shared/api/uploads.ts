import { adminAxiosClient as axiosClient } from './axiosClient'
import type { ApiResponse } from './types'

export type UploadedImage = { key: string; url: string }

const R2_PUBLIC_BASE_URL =
  import.meta.env.VITE_R2_PUBLIC_BASE_URL || 'https://pub-8f9cd5fcc337496695e7cca26b3e123b.r2.dev'

/**
 * คืน data เมื่อ API ระบุ success; โยน Error พร้อมข้อความ backend เมื่อ HTTP สำเร็จแต่ผลธุรกิจไม่สำเร็จ
 */
function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

export const uploadsApi = {
  /**
   * ส่ง File เป็น multipart field image ผ่าน admin client และคืน key/URL ที่ backend จัดเก็บแล้ว
   */
  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    const response = await axiosClient.post<ApiResponse<UploadedImage>>('/admin/uploads/images', formData)
    return dataOrThrow(response.data)
  },

  /**
   * ลบรูปผ่าน admin API ด้วย key ที่ encode แล้ว; คืน data เมื่อคำขอสำเร็จ
   */
  async deleteImage(key: string) {
    const response = await axiosClient.delete<ApiResponse<null>>(`/admin/uploads/images/${encodeURIComponent(key)}`)
    return dataOrThrow(response.data)
  },
}

const KEY_PATTERN = /^[0-9a-f-]+\.(jpg|png|webp|gif)$/i

/**
 * อ่านชื่อไฟล์ท้าย URL และคืน key เมื่อรูปแบบตรงกับชื่อรูปที่ระบบสร้าง มิฉะนั้นคืน null
 * ตรวจเฉพาะ path/รูปแบบชื่อไฟล์ โดยไม่ได้ตรวจว่า hostname ตรงกับ R2_PUBLIC_BASE_URL
 */
export function uploadedImageKey(url: string | undefined) {
  if (!url) return null
  try {
    const imageUrl = new URL(url, window.location.origin)
    const lastSegment = imageUrl.pathname.split('/').filter(Boolean).pop() ?? ''
    if (KEY_PATTERN.test(lastSegment)) return lastSegment
    return null
  } catch {
    return null
  }
}

export { R2_PUBLIC_BASE_URL }

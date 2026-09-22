import { adminAxiosClient as axiosClient } from './axiosClient'
import type { ApiResponse } from './types'

export type UploadedImage = { key: string; url: string }

const R2_PUBLIC_BASE_URL =
  import.meta.env.VITE_R2_PUBLIC_BASE_URL || 'https://pub-8f9cd5fcc337496695e7cca26b3e123b.r2.dev'

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message ?? 'ดำเนินการไม่สำเร็จ')
  return response.data
}

export const uploadsApi = {
  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    const response = await axiosClient.post<ApiResponse<UploadedImage>>('/admin/uploads/images', formData)
    return dataOrThrow(response.data)
  },

  async deleteImage(key: string) {
    const response = await axiosClient.delete<ApiResponse<null>>(`/admin/uploads/images/${encodeURIComponent(key)}`)
    return dataOrThrow(response.data)
  },
}

const KEY_PATTERN = /^[0-9a-f-]+\.(jpg|png|webp|gif)$/i

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

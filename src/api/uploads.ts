import { adminAxiosClient as axiosClient } from './axiosClient'
import type { ApiResponse } from './types'

export type UploadedImage = { key: string; url: string }

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

export function localImageKey(url: string | undefined) {
  if (!url) return null
  try {
    const baseUrl = axiosClient.defaults.baseURL
    const imageUrl = new URL(url)
    if (baseUrl && imageUrl.origin !== new URL(baseUrl).origin) return null
    return imageUrl.pathname.match(/\/assets\/([^/]+)$/)?.[1] ?? null
  } catch {
    return null
  }
}

import axios from "axios";
import { useAuth } from "../stores/authStore";
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  timeout: 15000,
});
axiosClient.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token && !token.startsWith("mock-"))
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) useAuth.getState().logout();
      const apiMessage = error.response?.data?.message;
      const message =
        typeof apiMessage === "string"
          ? apiMessage
          : status === 403
          ? "ไม่มีสิทธิ์เข้าถึงข้อมูล"
          : status && status >= 500
            ? "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่"
            : "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

import { QueryClient } from "@tanstack/react-query";
/** Cache กลางของแอป: ข้อมูลสดสิบวินาที ลอง query ซ้ำหนึ่งครั้ง และตรวจข้อมูลเมื่อกลับมา focus */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10000, retry: 1, refetchOnWindowFocus: true },
  },
});

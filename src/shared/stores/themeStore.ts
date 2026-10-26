import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  mode: "light" | "dark";
  toggle: () => void;
};

/** เก็บโหมด light/dark ใน Zustand และ persist ด้วย key classroom-theme สำหรับการเปิดเว็บครั้งถัดไป */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      /**
       * สลับ light/dark จากสถานะล่าสุด แล้วให้ persist middleware เก็บค่าที่เลือก
       */
      toggle: () =>
        set((state) => ({ mode: state.mode === "light" ? "dark" : "light" })),
    }),
    { name: "classroom-theme" },
  ),
);

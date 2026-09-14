import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  mode: "light" | "dark";
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      toggle: () =>
        set((state) => ({ mode: state.mode === "light" ? "dark" : "light" })),
    }),
    { name: "classroom-theme" },
  ),
);

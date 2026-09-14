import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";
type AuthState = {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  logout: () => void;
};
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user, token: `mock-${user.id}` }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "classroom-auth" },
  ),
);

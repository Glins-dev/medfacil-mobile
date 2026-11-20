import { create } from "zustand";

import type { UserRole } from "@/navigation/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  logout: () => void;
}

// Store inicial (em memória). A persistência com expo-secure-store entra em issue própria.
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));

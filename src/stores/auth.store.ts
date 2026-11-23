import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type { UserRole } from "@/navigation/types";
import type { UserSex } from "@/types/user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  crm?: string | null;
  cpf?: string | null;
  birthDate?: string | null;
  dataNascimento?: string | null;
  sexo?: UserSex | null;
  matricula?: string | null;
  registrationNumber?: string | null;
  patientCode?: string | null;
}

export interface AuthState {
  token: string | null;
  user: SessionUser | null;
  _hasHydrated: boolean;
  setSession: (token: string, user: SessionUser) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const AUTH_STORAGE_KEY = "medfacil_auth";

interface PersistedAuthPayload {
  state?: {
    token?: string | null;
    user?: SessionUser | null;
  };
}

// Adapter assincrono sobre o Keychain (iOS) e Keystore (Android) via expo-secure-store.
const secureStoreAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as PersistedAuthPayload;
      if (parsed?.state?.token == null && parsed?.state?.user == null) {
        await SecureStore.deleteItemAsync(name);
        return;
      }
    } catch {
      // Caso nao seja JSON esperado, segue gravando o valor serializado.
    }
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      // Persiste apenas token e user para respeitar o limite de tamanho por chave do SecureStore.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          useAuthStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

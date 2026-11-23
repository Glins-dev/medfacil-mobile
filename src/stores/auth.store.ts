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
  endereco?: string | null;
  address?: string | null;
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
const ADDRESS_STORAGE_KEY = "medfacil_user_addresses";

async function readAddressBook(): Promise<Record<string, string>> {
  try {
    const raw = await SecureStore.getItemAsync(ADDRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

// Persiste localmente o endereco informado no cadastro caso o backend nao o retorne no login.
export async function saveLocalUserAddress(params: {
  userId?: string | null;
  cpf?: string | null;
  address?: string | null;
}): Promise<void> {
  const cleanAddress = params.address?.trim();
  if (!cleanAddress) return;

  const book = await readAddressBook();
  const cleanId = params.userId?.trim();
  const cleanCpf = params.cpf?.replace(/\D/g, "");
  if (!cleanId && !cleanCpf) return;

  if (cleanId) book[`id:${cleanId}`] = cleanAddress;
  if (cleanCpf) book[`cpf:${cleanCpf}`] = cleanAddress;

  try {
    await SecureStore.setItemAsync(ADDRESS_STORAGE_KEY, JSON.stringify(book));
  } catch {
    // Ignora indisponibilidade de storage fora do ambiente nativo.
  }
}

// Recupera o endereco salvo localmente por id ou CPF para hidratar a sessao apos novo login.
export async function getLocalUserAddress(params: {
  userId?: string | null;
  cpf?: string | null;
}): Promise<string | null> {
  const book = await readAddressBook();
  const cleanId = params.userId?.trim();
  if (cleanId && book[`id:${cleanId}`]) {
    return book[`id:${cleanId}`];
  }
  const cleanCpf = params.cpf?.replace(/\D/g, "");
  if (cleanCpf && book[`cpf:${cleanCpf}`]) {
    return book[`cpf:${cleanCpf}`];
  }
  return null;
}

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

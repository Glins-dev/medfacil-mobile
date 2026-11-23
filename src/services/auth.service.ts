import { api } from "@/services/api";
import type { SessionUser } from "@/stores/auth.store";
import type { UserSex } from "@/types/user";
import { onlyDigits } from "@/utils/cpf";

export interface LoginPayload {
  cpf: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string; // DD/MM/AAAA
  sexo?: UserSex;
  endereco?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      ...payload,
      cpf: onlyDigits(payload.cpf),
    });
    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", {
      ...payload,
      cpf: onlyDigits(payload.cpf),
      phone: onlyDigits(payload.phone),
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

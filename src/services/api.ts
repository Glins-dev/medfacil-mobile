import axios from "axios";

import { useAuthStore } from "@/stores/auth.store";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000/api/v1";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401: limpa a sessão; o RootNavigator reage ao token nulo e volta ao Login.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)
      ?.message;
    if (message) return message;
    if (!error.response) return "Sem conexão com o servidor.";
  }
  return fallback;
}

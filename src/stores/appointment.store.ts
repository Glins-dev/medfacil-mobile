import { useEffect } from "react";
import { create } from "zustand";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export type AppointmentStatus = "AGENDADO" | "CONFIRMADO";

export interface Appointment {
  id: string;
  dateTime: string;
  status: AppointmentStatus;
  doctorId: string;
  doctorName: string;
  specialty: string | null;
}

// Rede de seguranca para mudancas feitas por terceiros (medico ou admin).
const STALE_AFTER_MS = 5 * 60 * 1000;

export type LoadStatus = "idle" | "loading" | "ready" | "error";

const sortByDate = (list: Appointment[]) =>
  [...list].sort((a, b) => a.dateTime.localeCompare(b.dateTime));

async function fetchAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>(
    "/appointments"
  );
  return data.appointments;
}

interface AppointmentState {
  userId: string | null;
  appointments: Appointment[];
  status: LoadStatus;
  fetchedAt: number | null;
  load: (options?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
  upsert: (appointment: Appointment) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// Evita requisicoes duplicadas quando multiplos componentes montam ao mesmo tempo.
let inflight: { userId: string; promise: Promise<void> } | null = null;

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  userId: null,
  appointments: [],
  status: "idle",
  fetchedAt: null,

  load: async ({ force = false } = {}) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const { userId: cachedFor, status, fetchedAt } = get();
    const sameUser = cachedFor === userId;
    const isFresh =
      sameUser &&
      status === "ready" &&
      fetchedAt !== null &&
      Date.now() - fetchedAt < STALE_AFTER_MS;

    if (isFresh && !force) return;
    if (inflight?.userId === userId) return inflight.promise;

    // Outro usuario descarta o cache; mesmo usuario com dado antigo atualiza em segundo plano.
    if (!sameUser) {
      set({ userId, appointments: [], status: "loading", fetchedAt: null });
    } else if (status !== "ready") {
      set({ status: "loading" });
    }

    const promise = fetchAppointments()
      .then((appointments) => {
        if (useAuthStore.getState().user?.id !== userId) return;
        set({
          userId,
          appointments: sortByDate(appointments),
          status: "ready",
          fetchedAt: Date.now(),
        });
      })
      .catch(() => {
        if (useAuthStore.getState().user?.id !== userId) return;
        // Falha ao atualizar em segundo plano nao apaga o dado que ja existe.
        if (get().status !== "ready") set({ status: "error" });
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });

    inflight = { userId, promise };
    return promise;
  },

  // Marca o cache como vencido: a proxima visita busca de novo.
  invalidate: () => set({ fetchedAt: null }),

  // Usadas depois que a API confirma uma mudanca feita pelo proprio paciente.
  upsert: (appointment) =>
    set((s) =>
      s.status === "ready"
        ? {
            appointments: sortByDate([
              ...s.appointments.filter((a) => a.id !== appointment.id),
              appointment,
            ]),
          }
        : s
    ),

  remove: (id) =>
    set((s) => ({
      appointments: s.appointments.filter((a) => a.id !== id),
    })),

  clear: () => {
    inflight = null;
    const { userId, appointments, status, fetchedAt } = get();
    if (
      userId === null &&
      appointments.length === 0 &&
      status === "idle" &&
      fetchedAt === null
    ) {
      return;
    }
    set({
      userId: null,
      appointments: [],
      status: "idle",
      fetchedAt: null,
    });
  },
}));

// Limpa o cache de consultas imediatamente no logout ou troca de usuario sem ciclo de imports.
useAuthStore.subscribe((state, prevState) => {
  const loggedOut = !state.token || !state.user;
  const switchedUser =
    Boolean(prevState.user?.id) && state.user?.id !== prevState.user?.id;
  if (loggedOut || switchedUser) {
    useAppointmentStore.getState().clear();
  }
});

export function useAppointments() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const userId = useAppointmentStore((s) => s.userId);
  const appointments = useAppointmentStore((s) => s.appointments);
  const status = useAppointmentStore((s) => s.status);
  const load = useAppointmentStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [currentUserId, load]);

  // Nunca mostra o dado de outro usuario (ex.: logout e login com outra conta).
  const isOwn = userId === currentUserId;

  return {
    appointments: isOwn ? appointments : [],
    status: !isOwn || status === "idle" ? ("loading" as const) : status,
    reload: () => {
      void load({ force: true });
    },
  };
}

// A Home so precisa da primeira consulta da lista (ja ordenada).
export function useNextAppointment() {
  const { appointments, status, reload } = useAppointments();
  return { appointment: appointments[0] ?? null, status, reload };
}

import { useEffect } from "react";
import { create } from "zustand";

import {
  appointmentService,
  type Appointment,
  type AppointmentStatus,
} from "@/services/appointment.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatTime, getClinicDateKey } from "@/utils/date";

export type { Appointment, AppointmentStatus };

// Verifica se o paciente ja possui consulta ativa no mesmo dia e horario (America/Recife).
export function findPatientAppointmentConflict(
  appointments: Appointment[],
  date: string,
  time: string,
  ignoreAppointmentId?: string
): Appointment | null {
  return (
    appointments.find((item) => {
      if (ignoreAppointmentId && item.id === ignoreAppointmentId) return false;
      if (item.status !== "AGENDADO" && item.status !== "CONFIRMADO") {
        return false;
      }
      return (
        getClinicDateKey(item.dateTime) === date &&
        formatTime(item.dateTime) === time
      );
    }) ?? null
  );
}

// Rede de seguranca para mudancas feitas por terceiros (medico ou admin).
const STALE_AFTER_MS = 5 * 60 * 1000;

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export type AttendanceConfirmationStatus = "CONFIRMED" | "DECLINED";

export function getEffectiveAppointmentStatus(
  appointment: Appointment,
  attendance?: AttendanceConfirmationStatus
): AppointmentStatus {
  if (
    appointment.status === "CANCELADO" ||
    appointment.status === "CONCLUIDO"
  ) {
    return appointment.status;
  }
  if (attendance === "CONFIRMED") {
    return "CONFIRMADO";
  }
  return appointment.status;
}

const sortByDate = (list: Appointment[]) =>
  [...list].sort((a, b) => a.dateTime.localeCompare(b.dateTime));

interface AppointmentState {
  userId: string | null;
  appointments: Appointment[];
  attendanceById: Record<string, AttendanceConfirmationStatus>;
  status: LoadStatus;
  fetchedAt: number | null;
  load: (options?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
  upsert: (appointment: Appointment) => void;
  setAttendance: (
    appointmentId: string,
    response: AttendanceConfirmationStatus
  ) => void;
  clearAttendance: (appointmentId: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// Evita requisicoes duplicadas quando multiplos componentes montam ao mesmo tempo.
let inflight: { userId: string; promise: Promise<void> } | null = null;

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  userId: null,
  appointments: [],
  attendanceById: {},
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
      set({
        userId,
        appointments: [],
        attendanceById: {},
        status: "loading",
        fetchedAt: null,
      });
    } else if (status !== "ready") {
      set({ status: "loading" });
    }

    const promise = appointmentService
      .list()
      .then((appointments) => {
        if (useAuthStore.getState().user?.id !== userId) return;
        const prevAttendance = get().attendanceById;
        const validIds = new Set(
          appointments
            .filter((a) => a.status !== "CANCELADO" && a.status !== "CONCLUIDO")
            .map((a) => a.id)
        );
        const nextAttendance: Record<string, AttendanceConfirmationStatus> = {};
        for (const [id, value] of Object.entries(prevAttendance)) {
          if (validIds.has(id)) {
            nextAttendance[id] = value;
          }
        }
        set({
          userId,
          appointments: sortByDate(appointments),
          attendanceById: nextAttendance,
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
    set((s) => {
      const existing = s.appointments.find((a) => a.id === appointment.id);
      const shouldResetAttendance =
        appointment.status === "CANCELADO" ||
        appointment.status === "CONCLUIDO" ||
        (existing !== undefined && existing.dateTime !== appointment.dateTime);

      let nextAttendance = s.attendanceById;
      if (shouldResetAttendance && appointment.id in s.attendanceById) {
        nextAttendance = { ...s.attendanceById };
        delete nextAttendance[appointment.id];
      }

      if (s.status !== "ready") {
        return nextAttendance !== s.attendanceById
          ? { attendanceById: nextAttendance }
          : s;
      }

      return {
        appointments: sortByDate([
          ...s.appointments.filter((a) => a.id !== appointment.id),
          appointment,
        ]),
        attendanceById: nextAttendance,
      };
    }),

  setAttendance: (appointmentId, response) =>
    set((s) => ({
      attendanceById: {
        ...s.attendanceById,
        [appointmentId]: response,
      },
    })),

  clearAttendance: (appointmentId) =>
    set((s) => {
      if (!(appointmentId in s.attendanceById)) return s;
      const next = { ...s.attendanceById };
      delete next[appointmentId];
      return { attendanceById: next };
    }),

  remove: (id) =>
    set((s) => {
      let nextAttendance = s.attendanceById;
      if (id in s.attendanceById) {
        nextAttendance = { ...s.attendanceById };
        delete nextAttendance[id];
      }
      return {
        appointments: s.appointments.filter((a) => a.id !== id),
        attendanceById: nextAttendance,
      };
    }),

  clear: () => {
    inflight = null;
    const { userId, appointments, attendanceById, status, fetchedAt } = get();
    if (
      userId === null &&
      appointments.length === 0 &&
      Object.keys(attendanceById).length === 0 &&
      status === "idle" &&
      fetchedAt === null
    ) {
      return;
    }
    set({
      userId: null,
      appointments: [],
      attendanceById: {},
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
    reload: () => load({ force: true }),
  };
}

// A Home retorna a primeira consulta futura ativa da lista (ja ordenada).
export function useNextAppointment() {
  const { appointments, status, reload } = useAppointments();
  const nowIso = new Date().toISOString();
  const next =
    appointments.find(
      (item) =>
        item.status !== "CANCELADO" &&
        item.status !== "CONCLUIDO" &&
        item.dateTime >= nowIso
    ) ?? null;

  return { appointment: next, status, reload };
}

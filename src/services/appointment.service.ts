import { api, getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import type { LocalBookedAppointment } from "@/types/admin";
import { formatTime, getClinicDateKey } from "@/utils/date";

export type AppointmentStatus =
  | "AGENDADO"
  | "CONFIRMADO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface Appointment {
  id: string;
  dateTime: string; // ISO (UTC)
  status: AppointmentStatus;
  doctorId: string;
  doctorName: string;
  specialty: string | null;
  hospitalName?: string | null;
  hospitalAddress?: string | null;
}

export interface BookAppointmentPayload {
  doctorId: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
  specialty?: string | null;
  doctorName?: string;
  doctorCrm?: string | null;
  hospitalId?: string | null;
  hospitalName?: string | null;
  hospitalAddress?: string | null;
  patientId?: string;
  patientName?: string;
}

export interface RescheduleAppointmentPayload {
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
}

export class BookingConflictError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export interface ClassifiedBookingError {
  status?: number;
  isConflict: boolean;
  message: string;
}

// Classifica falhas de agendamento garantindo que somente HTTP 409 acione o fluxo de conflito de horario.
export function classifyBookingError(
  error: unknown,
  fallback = "Não foi possível agendar a consulta. Tente novamente."
): ClassifiedBookingError {
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error, fallback);
  return {
    status,
    isConflict: status === 409,
    message,
  };
}

// Monta exclusivamente o contrato esperado pelo endpoint POST /appointments.
export function buildBookRequestPayload(payload: BookAppointmentPayload): {
  doctorId: string;
  date: string;
  time: string;
} {
  return {
    doctorId: payload.doctorId.trim(),
    date: payload.date.trim(),
    time: payload.time.trim(),
  };
}

// Converte data "AAAA-MM-DD" e hora "HH:mm" (America/Recife, -03:00) em ISO UTC.
export function clinicSlotToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

function resolveBookingLocation(
  payload: BookAppointmentPayload,
  slotHospitalId: string | null | undefined,
  doctorId: string
): {
  hospitalId: string | null;
  hospitalName: string | null;
  hospitalAddress: string | null;
} {
  const adminState = useAdminStore.getState();
  const matchedHospital =
    (payload.hospitalId
      ? adminState.hospitals.find((h) => h.id === payload.hospitalId)
      : null) ??
    (slotHospitalId
      ? adminState.hospitals.find((h) => h.id === slotHospitalId)
      : null) ??
    adminState.hospitals.find((h) => h.doctorIds.includes(doctorId)) ??
    null;

  return {
    hospitalId: payload.hospitalId ?? matchedHospital?.id ?? null,
    hospitalName: payload.hospitalName ?? matchedHospital?.name ?? null,
    hospitalAddress:
      payload.hospitalAddress ?? matchedHospital?.address ?? null,
  };
}

function toAppointment(item: LocalBookedAppointment): Appointment {
  return {
    id: item.id,
    dateTime: item.dateTime,
    status: item.status,
    doctorId: item.doctorId,
    doctorName: item.doctorName,
    specialty: item.specialty,
    hospitalName: item.hospitalName ?? null,
    hospitalAddress: item.hospitalAddress ?? null,
  };
}

function hasActiveSlotConflict(
  appointments: LocalBookedAppointment[],
  opts: {
    doctorId?: string;
    patientId?: string;
    date: string;
    time: string;
    ignoreId?: string;
  }
): { doctorBusy: boolean; patientBusy: boolean } {
  let doctorBusy = false;
  let patientBusy = false;

  for (const item of appointments) {
    if (opts.ignoreId && item.id === opts.ignoreId) continue;
    if (item.status === "CANCELADO" || item.status === "CONCLUIDO") continue;
    if (
      getClinicDateKey(item.dateTime) !== opts.date ||
      formatTime(item.dateTime) !== opts.time
    ) {
      continue;
    }
    if (opts.doctorId && item.doctorId === opts.doctorId) {
      doctorBusy = true;
    }
    if (opts.patientId && item.patientId === opts.patientId) {
      patientBusy = true;
    }
  }

  return { doctorBusy, patientBusy };
}

export const appointmentService = {
  list: async (): Promise<Appointment[]> => {
    const [{ data: upcomingData }, { data: historyData }] = await Promise.all([
      api.get<{ appointments: Appointment[] }>("/appointments"),
      api.get<{ appointments: Appointment[] }>("/appointments/history"),
    ]);
    const adminState = useAdminStore.getState();
    const currentUserId = useAuthStore.getState().user?.id;

    const remoteById = new Map(
      [...upcomingData.appointments, ...historyData.appointments].map((item) => [
        item.id,
        item,
      ])
    );
    const remoteEnriched: Appointment[] = [...remoteById.values()].map((appt) => {
      const savedLocation = adminState.appointmentLocationsById[appt.id];
      return {
        ...appt,
        hospitalName:
          appt.hospitalName ?? savedLocation?.hospitalName ?? null,
        hospitalAddress:
          appt.hospitalAddress ?? savedLocation?.hospitalAddress ?? null,
      };
    });

    const seenIds = new Set(remoteEnriched.map((item) => item.id));
    const localOwn: Appointment[] = adminState.localAppointments
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        if (currentUserId && item.patientId !== currentUserId) return false;
        return true;
      })
      .map(toAppointment);

    return [...remoteEnriched, ...localOwn].sort((a, b) =>
      a.dateTime.localeCompare(b.dateTime)
    );
  },

  cancel: async (id: string): Promise<void> => {
    const adminState = useAdminStore.getState();
    const isLocal = adminState.localAppointments.some((item) => item.id === id);
    if (isLocal) {
      adminState.cancelLocalAppointment(id);
      return;
    }
    await api.patch(`/appointments/${id}/cancel`);
  },

  confirm: async (id: string): Promise<Appointment> => {
    const { data } = await api.patch<{ appointment: Appointment }>(
      `/appointments/${id}/confirm`
    );
    return data.appointment;
  },

  book: async (payload: BookAppointmentPayload): Promise<Appointment> => {
    const requestBody = buildBookRequestPayload(payload);
    const adminState = useAdminStore.getState();
    const authUser = useAuthStore.getState().user;
    const patientId = payload.patientId ?? authUser?.id ?? "local-patient";
    const patientName = payload.patientName ?? authUser?.name ?? "Paciente";

    const matchingAdminSlot = adminState.scheduleSlots.find(
      (slot) =>
        slot.doctorId === requestBody.doctorId &&
        slot.date === requestBody.date &&
        slot.time === requestBody.time
    );
    const storedDoctor = adminState.doctors.find(
      (doc) => doc.id === requestBody.doctorId
    );
    const location = resolveBookingLocation(
      payload,
      matchingAdminSlot?.hospitalId,
      requestBody.doctorId
    );

    const localConflict = hasActiveSlotConflict(adminState.localAppointments, {
      doctorId: requestBody.doctorId,
      patientId,
      date: requestBody.date,
      time: requestBody.time,
    });
    if (localConflict.patientBusy) {
      throw new BookingConflictError(
        "Você já possui uma consulta neste horário."
      );
    }
    if (localConflict.doctorBusy) {
      throw new BookingConflictError("Este horário não está mais disponível.");
    }

    try {
      const { data } = await api.post<{ appointment: Appointment }>(
        "/appointments",
        requestBody
      );

      if (location.hospitalName && location.hospitalAddress) {
        useAdminStore.getState().setAppointmentLocation(data.appointment.id, {
          hospitalId: location.hospitalId,
          hospitalName: location.hospitalName,
          hospitalAddress: location.hospitalAddress,
        });
      }

      if (matchingAdminSlot) {
        useAdminStore
          .getState()
          .consumeScheduleSlot(
            requestBody.doctorId,
            requestBody.date,
            requestBody.time
          );
      }

      return {
        ...data.appointment,
        hospitalName:
          location.hospitalName ?? data.appointment.hospitalName ?? null,
        hospitalAddress:
          location.hospitalAddress ?? data.appointment.hospitalAddress ?? null,
      };
    } catch (error) {
      const status = getApiErrorStatus(error);
      const message = getApiErrorMessage(error, "");
      const isPatientDoubleBooking = /j[aá]\s+possui/i.test(message);

      // Horarios avulsos adicionados pelo Admin no app nao existem na tabela Agenda do backend (HTTP 409/404).
      if (
        (matchingAdminSlot || storedDoctor?.source === "local") &&
        (status === 409 || status === 404) &&
        !isPatientDoubleBooking
      ) {
        const localAppointment: LocalBookedAppointment = {
          id: `local-appt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dateTime: clinicSlotToIso(requestBody.date, requestBody.time),
          status: "AGENDADO",
          doctorId: requestBody.doctorId,
          doctorName: payload.doctorName ?? storedDoctor?.name ?? "Médico",
          doctorCrm: payload.doctorCrm ?? storedDoctor?.crm ?? null,
          specialty:
            payload.specialty ?? storedDoctor?.specialtyNames[0] ?? null,
          patientId,
          patientName,
          hospitalId: location.hospitalId,
          hospitalName: location.hospitalName,
          hospitalAddress: location.hospitalAddress,
        };

        useAdminStore
          .getState()
          .addLocalAppointment(localAppointment, requestBody);
        return toAppointment(localAppointment);
      }

      throw error;
    }
  },

  // Mantem o mesmo medico; so troca data e horario.
  reschedule: async (
    id: string,
    payload: RescheduleAppointmentPayload
  ): Promise<Appointment> => {
    const adminState = useAdminStore.getState();
    const localTarget = adminState.localAppointments.find(
      (item) => item.id === id
    );
    if (localTarget) {
      const conflict = hasActiveSlotConflict(adminState.localAppointments, {
        doctorId: localTarget.doctorId,
        patientId: localTarget.patientId,
        date: payload.date,
        time: payload.time,
        ignoreId: id,
      });
      if (conflict.patientBusy) {
        throw new BookingConflictError(
          "Você já possui uma consulta neste horário."
        );
      }
      if (conflict.doctorBusy) {
        throw new BookingConflictError("Este horário não está mais disponível.");
      }

      adminState.rescheduleLocalAppointment(id, payload.date, payload.time);
      const updated = useAdminStore
        .getState()
        .localAppointments.find((item) => item.id === id);
      return toAppointment(updated ?? {
        ...localTarget,
        dateTime: clinicSlotToIso(payload.date, payload.time),
        status: "AGENDADO",
      });
    }

    const { data } = await api.patch<{ appointment: Appointment }>(
      `/appointments/${id}/reschedule`,
      payload
    );
    const savedLocation = useAdminStore.getState().appointmentLocationsById[id];
    return {
      ...data.appointment,
      hospitalName:
        data.appointment.hospitalName ?? savedLocation?.hospitalName ?? null,
      hospitalAddress:
        data.appointment.hospitalAddress ??
        savedLocation?.hospitalAddress ??
        null,
    };
  },
};

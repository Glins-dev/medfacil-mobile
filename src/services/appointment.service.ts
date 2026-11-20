import { api } from "@/services/api";

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
}

export interface BookAppointmentPayload {
  doctorId: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
}

export interface RescheduleAppointmentPayload {
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
}

export const appointmentService = {
  list: async (): Promise<Appointment[]> => {
    const { data } = await api.get<{ appointments: Appointment[] }>(
      "/appointments"
    );
    return data.appointments;
  },

  cancel: async (id: string): Promise<void> => {
    await api.patch(`/appointments/${id}/cancel`);
  },

  book: async (payload: BookAppointmentPayload): Promise<Appointment> => {
    const { data } = await api.post<{ appointment: Appointment }>(
      "/appointments",
      payload
    );
    return data.appointment;
  },

  // Mantém o mesmo médico; só troca data e horário.
  reschedule: async (
    id: string,
    payload: RescheduleAppointmentPayload
  ): Promise<Appointment> => {
    const { data } = await api.patch<{ appointment: Appointment }>(
      `/appointments/${id}/reschedule`,
      payload
    );
    return data.appointment;
  },
};

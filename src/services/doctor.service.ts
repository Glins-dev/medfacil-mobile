import { api } from "@/services/api";
import type { AppointmentStatus } from "@/services/appointment.service";

// Espelha o enum StatusAtendimento do back (prisma/schema.prisma).
export type AttendanceStatus =
  | "AGUARDANDO"
  | "EM_ESPERA"
  | "EM_ATENDIMENTO"
  | "FINALIZADO";

export interface DoctorAppointment {
  id: string;
  dateTime: string; // ISO (UTC)
  status: AppointmentStatus;
  attendanceStatus: AttendanceStatus;
  patientId?: string | null;
  patientName: string;
  reason: string | null;
}

export const doctorService = {
  // Próximas consultas do médico logado, da mais próxima para a mais distante.
  listUpcoming: async (limit = 5): Promise<DoctorAppointment[]> => {
    const { data } = await api.get<{ appointments: DoctorAppointment[] }>(
      "/doctor/appointments",
      { params: { limit } }
    );
    return data.appointments;
  },
};

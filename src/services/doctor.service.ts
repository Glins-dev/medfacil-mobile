import { api } from "@/services/api";
import type { AppointmentStatus } from "@/services/appointment.service";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import { resolveDoctorLinkedHospitals } from "@/utils/adminRules";

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
  // Proximas consultas do medico logado, da mais proxima para a mais distante.
  listUpcoming: async (limit = 5): Promise<DoctorAppointment[]> => {
    const { data } = await api.get<{ appointments: DoctorAppointment[] }>(
      "/doctor/appointments",
      { params: { limit } }
    );

    const adminState = useAdminStore.getState();
    const authUser = useAuthStore.getState().user;
    const { matchedDoctorIds } = resolveDoctorLinkedHospitals(
      authUser,
      adminState.doctors,
      adminState.hospitals
    );
    const doctorIdSet = new Set(matchedDoctorIds);
    const seenIds = new Set(data.appointments.map((item) => item.id));
    const cutoffMs = Date.now() - 60 * 60 * 1000;

    const localUpcoming: DoctorAppointment[] = adminState.localAppointments
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        if (!doctorIdSet.has(item.doctorId)) return false;
        if (item.status === "CANCELADO" || item.status === "CONCLUIDO") {
          return false;
        }
        return new Date(item.dateTime).getTime() >= cutoffMs;
      })
      .map((item) => ({
        id: item.id,
        dateTime: item.dateTime,
        status: item.status,
        attendanceStatus: "AGUARDANDO" as const,
        patientId: item.patientId,
        patientName: item.patientName,
        reason: item.specialty,
      }));

    return [...data.appointments, ...localUpcoming]
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(0, limit);
  },
};

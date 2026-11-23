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
  specialty?: string | null;
  hospitalName?: string | null;
  hospitalAddress?: string | null;
}

const MAX_DOCTOR_UPCOMING_LIMIT = 20;

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
        specialty: item.specialty,
        hospitalName: item.hospitalName ?? null,
        hospitalAddress: item.hospitalAddress ?? null,
      }));

    return [...data.appointments, ...localUpcoming]
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(0, limit);
  },

  // Agenda completa do medico para visualizacoes Dia, Semana e Mes enriquecida com especialidade e hospital.
  listSchedule: async (): Promise<DoctorAppointment[]> => {
    const { data } = await api.get<{ appointments: DoctorAppointment[] }>(
      "/doctor/appointments",
      { params: { limit: MAX_DOCTOR_UPCOMING_LIMIT } }
    );

    const adminState = useAdminStore.getState();
    const authUser = useAuthStore.getState().user;
    const { matchedDoctorIds, doctorSpecialtyIds, linkedHospitals } =
      resolveDoctorLinkedHospitals(
        authUser,
        adminState.doctors,
        adminState.hospitals
      );

    const doctorIdSet = new Set(matchedDoctorIds);
    const matchedDoctor = adminState.doctors.find((doc) =>
      doctorIdSet.has(doc.id)
    );
    const specialtyById = new Map(
      adminState.specialties.map((spec) => [spec.id.toLowerCase(), spec.name])
    );
    const fallbackSpecialty =
      matchedDoctor?.specialtyNames.find((name) => name.trim().length > 0) ??
      doctorSpecialtyIds
        .map((id) => specialtyById.get(id.toLowerCase()))
        .find((name): name is string => Boolean(name)) ??
      null;
    const fallbackHospital = linkedHospitals[0] ?? null;

    const enrichedRemote: DoctorAppointment[] = data.appointments.map(
      (item) => {
        const savedLoc = adminState.appointmentLocationsById[item.id];
        return {
          ...item,
          specialty: item.specialty ?? item.reason ?? fallbackSpecialty,
          hospitalName:
            item.hospitalName ??
            savedLoc?.hospitalName ??
            fallbackHospital?.name ??
            null,
          hospitalAddress:
            item.hospitalAddress ??
            savedLoc?.hospitalAddress ??
            fallbackHospital?.address ??
            null,
        };
      }
    );

    const seenIds = new Set(enrichedRemote.map((item) => item.id));
    const localAll: DoctorAppointment[] = adminState.localAppointments
      .filter(
        (item) => !seenIds.has(item.id) && doctorIdSet.has(item.doctorId)
      )
      .map((item) => ({
        id: item.id,
        dateTime: item.dateTime,
        status: item.status,
        attendanceStatus:
          item.status === "CONCLUIDO"
            ? ("FINALIZADO" as const)
            : ("AGUARDANDO" as const),
        patientId: item.patientId,
        patientName: item.patientName,
        reason: item.specialty,
        specialty: item.specialty ?? fallbackSpecialty,
        hospitalName: item.hospitalName ?? fallbackHospital?.name ?? null,
        hospitalAddress:
          item.hospitalAddress ?? fallbackHospital?.address ?? null,
      }));

    return [...enrichedRemote, ...localAll].sort((a, b) =>
      a.dateTime.localeCompare(b.dateTime)
    );
  },
};

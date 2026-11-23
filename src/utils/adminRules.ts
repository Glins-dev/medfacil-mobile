import type { AdminDoctor, Hospital, ScheduleSlot } from "@/types/admin";
import { getClinicDateKey } from "@/utils/date";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Converte DD/MM/AAAA em AAAA-MM-DD validando data real no calendario.
export function brDateToIsoKey(brDate: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match.map(Number);
  if (yyyy < 1900 || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }

  const utc = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (
    utc.getUTCFullYear() !== yyyy ||
    utc.getUTCMonth() !== mm - 1 ||
    utc.getUTCDate() !== dd
  ) {
    return null;
  }

  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// Valida data de agenda em DD/MM/AAAA garantindo que seja hoje ou futura em America/Recife.
export function isValidScheduleDate(
  brDate: string,
  referenceDate: Date = new Date()
): boolean {
  const isoKey = brDateToIsoKey(brDate);
  if (!isoKey) return false;
  const todayKey = getClinicDateKey(referenceDate.toISOString());
  return isoKey >= todayKey;
}

// Valida horario no formato 24h HH:mm.
export function isValidTimeSlot(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

// Regra obrigatoria: medico precisa ter ao menos uma especialidade atendida pelo hospital.
export function isDoctorCompatibleWithHospital(
  doctor: Pick<AdminDoctor, "specialtyIds">,
  hospital: Pick<Hospital, "specialtyIds">
): boolean {
  if (hospital.specialtyIds.length === 0 || doctor.specialtyIds.length === 0) {
    return false;
  }
  const hospitalSet = new Set(hospital.specialtyIds);
  return doctor.specialtyIds.some((id) => hospitalSet.has(id));
}

// Filtra medicos compativeis com o hospital selecionado e separa vinculados vs disponiveis.
export function filterCompatibleDoctorsForHospital(
  doctors: AdminDoctor[],
  hospital: Pick<Hospital, "specialtyIds" | "doctorIds">
): {
  compatible: AdminDoctor[];
  linked: AdminDoctor[];
  availableToLink: AdminDoctor[];
} {
  const linkedSet = new Set(hospital.doctorIds);
  const compatible = doctors.filter((doc) =>
    isDoctorCompatibleWithHospital(doc, hospital)
  );
  const linked = compatible.filter((doc) => linkedSet.has(doc.id));
  const availableToLink = compatible.filter((doc) => !linkedSet.has(doc.id));

  return { compatible, linked, availableToLink };
}

// Verifica duplicidade de horario para o mesmo medico na mesma data e hora.
export function hasDuplicateScheduleSlot(
  slots: Array<Pick<ScheduleSlot, "doctorId" | "date" | "time">>,
  candidate: Pick<ScheduleSlot, "doctorId" | "date" | "time">
): boolean {
  return slots.some(
    (slot) =>
      slot.doctorId === candidate.doctorId &&
      slot.date === candidate.date &&
      slot.time === candidate.time
  );
}

export interface DoctorIdentity {
  id: string;
  email?: string | null;
  crm?: string | null;
}

// Identifica hospitais e especialidades associados ao medico autenticado por id, CRM ou e-mail.
export function resolveDoctorLinkedHospitals(
  user: DoctorIdentity | null | undefined,
  doctors: AdminDoctor[],
  hospitals: Hospital[]
): {
  matchedDoctorIds: string[];
  doctorSpecialtyIds: string[];
  linkedHospitals: Hospital[];
} {
  if (!user) {
    return {
      matchedDoctorIds: [],
      doctorSpecialtyIds: [],
      linkedHospitals: [],
    };
  }

  const normalizedCrm = user.crm?.trim().toUpperCase() || null;
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  const matchedDoctors = doctors.filter((doctor) => {
    if (doctor.id === user.id) return true;
    if (normalizedCrm && doctor.crm.trim().toUpperCase() === normalizedCrm) {
      return true;
    }
    if (
      normalizedEmail &&
      doctor.email?.trim().toLowerCase() === normalizedEmail
    ) {
      return true;
    }
    return false;
  });

  const matchedIdSet = new Set<string>([
    user.id,
    ...matchedDoctors.map((doc) => doc.id),
  ]);
  const doctorSpecialtyIds = [
    ...new Set(matchedDoctors.flatMap((doc) => doc.specialtyIds)),
  ];
  const linkedHospitals = hospitals.filter((hospital) =>
    hospital.doctorIds.some((id) => matchedIdSet.has(id))
  );

  return {
    matchedDoctorIds: [...matchedIdSet],
    doctorSpecialtyIds,
    linkedHospitals,
  };
}

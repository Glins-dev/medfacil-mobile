import type { SpecialtyCatalogItem } from "@/utils/specialties";

export type AdminSpecialtyItem = SpecialtyCatalogItem;

export interface AdminDoctor {
  id: string;
  name: string;
  email?: string | null;
  crm: string;
  specialtyIds: string[];
  specialtyNames: string[];
  source: "api" | "local";
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  specialtyIds: string[];
  specialtyNamesById?: Record<string, string>;
  doctorIds: string[];
}

export interface ScheduleSlot {
  id: string;
  doctorId: string;
  hospitalId?: string | null;
  date: string; // AAAA-MM-DD (America/Recife)
  time: string; // HH:mm
}

export interface RemovedScheduleSlot {
  doctorId: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
}

export type LocalAppointmentStatus =
  | "AGENDADO"
  | "CONFIRMADO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface AppointmentLocationMetadata {
  hospitalId?: string | null;
  hospitalName: string;
  hospitalAddress: string;
}

export interface LocalBookedAppointment {
  id: string;
  dateTime: string; // ISO (UTC)
  status: LocalAppointmentStatus;
  doctorId: string;
  doctorName: string;
  doctorCrm?: string | null;
  specialty: string | null;
  patientId: string;
  patientName: string;
  hospitalId?: string | null;
  hospitalName?: string | null;
  hospitalAddress?: string | null;
}

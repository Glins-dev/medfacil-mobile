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

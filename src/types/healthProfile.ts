export const BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Não sei informar",
] as const;

export type BloodType = (typeof BLOOD_TYPE_OPTIONS)[number];

export const COMORBIDITY_OPTIONS = [
  "Hipertensão arterial",
  "Diabetes mellitus",
  "Obesidade",
  "Asma ou DPOC",
  "Doença cardíaca",
  "Colesterol alto",
  "Doença renal crônica",
  "Doença da tireoide",
  "Depressão ou ansiedade",
  "Artrite ou artrose",
] as const;

export const ALLERGY_OPTIONS = [
  "Dipirona",
  "Penicilina / Amoxicilina",
  "Anti-inflamatórios (AINEs)",
  "Ácido acetilsalicílico (AAS)",
  "Sulfa",
  "Contraste iodado",
  "Látex",
  "Alergia alimentar",
  "Poeira, pólen ou ácaros",
] as const;

export interface PatientHealthProfile {
  patientId: string;
  patientName?: string;
  weightKg: number | null;
  heightCm: number | null;
  bloodType: BloodType;
  comorbidities: string[];
  specialConditions: string;
  allergies: string[];
  otherAllergies: string;
  updatedAt: string; // ISO
}

export type SaveHealthProfileInput = Omit<PatientHealthProfile, "updatedAt">;

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorCrm: string;
  medicationName: string;
  dosageMg: string;
  dailyInstructions: string;
  createdAt: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorCrm: string;
  medicationName: string;
  dosageMg: string;
  dailyInstructions: string;
}

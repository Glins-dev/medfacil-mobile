import { formatDosageMg } from "@/schemas/prescription.schema";
import {
  matchesPatientPrescription,
  usePrescriptionStore,
} from "@/stores/prescription.store";
import type {
  CreatePrescriptionInput,
  Prescription,
} from "@/types/prescription";

function generatePrescriptionId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `rx_${Date.now()}_${randomPart}`;
}

// Camada assincrona de receitas medicas pronta para futura integracao REST.
export const prescriptionService = {
  listByPatient: async (patient: {
    id: string;
    name?: string | null;
  }): Promise<Prescription[]> => {
    const items = usePrescriptionStore.getState().prescriptions;
    return items.filter((item) => matchesPatientPrescription(item, patient));
  },

  listByDoctor: async (doctorId: string): Promise<Prescription[]> => {
    const items = usePrescriptionStore.getState().prescriptions;
    return items.filter((item) => item.doctorId === doctorId);
  },

  create: async (input: CreatePrescriptionInput): Promise<Prescription> => {
    const created: Prescription = {
      id: generatePrescriptionId(),
      patientId: input.patientId.trim(),
      patientName: input.patientName.trim(),
      doctorId: input.doctorId.trim(),
      doctorName: input.doctorName.trim(),
      doctorCrm: input.doctorCrm.trim() || "Não informado",
      medicationName: input.medicationName.trim(),
      dosageMg: formatDosageMg(input.dosageMg),
      dailyInstructions: input.dailyInstructions.trim(),
      createdAt: new Date().toISOString(),
    };

    usePrescriptionStore.getState().addPrescription(created);
    return created;
  },
};

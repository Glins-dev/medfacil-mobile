import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

import {
  formatDosageMg,
  prescriptionSchema,
} from "@/schemas/prescription.schema";
import { prescriptionService } from "@/services/prescription.service";
import {
  buildFallbackPatientId,
  matchesPatientPrescription,
  usePrescriptionStore,
} from "@/stores/prescription.store";

describe("receitas medicas (schema, store e servico)", () => {
  beforeEach(() => {
    usePrescriptionStore.getState().clearPrescriptions();
  });

  it("valida os tres campos obrigatorios e formata dosagem em mg", () => {
    const parsed = prescriptionSchema.safeParse({
      medicationName: "  Amoxicilina ",
      dosageMg: "500",
      dailyInstructions: "Tomar 1 comprimido a cada 8 horas por 7 dias.",
    });

    expect(parsed.success).toBe(true);
    expect(formatDosageMg("500")).toBe("500 mg");
    expect(formatDosageMg("12,5 mg")).toBe("12,5 mg");

    const invalidDosage = prescriptionSchema.safeParse({
      medicationName: "Dipirona",
      dosageMg: "abc",
      dailyInstructions: "Tomar 1 comprimido se tiver febre.",
    });
    expect(invalidDosage.success).toBe(false);

    const missingFields = prescriptionSchema.safeParse({
      medicationName: "A",
      dosageMg: "0",
      dailyInstructions: "1x",
    });
    expect(missingFields.success).toBe(false);
  });

  it("faz matching de paciente por id e por nome normalizado de fallback", () => {
    const fallbackId = buildFallbackPatientId("  José   Álvaro  ");
    expect(fallbackId).toBe("name:jose alvaro");

    const sample = {
      id: "rx_1",
      patientId: fallbackId,
      patientName: "José Álvaro",
      doctorId: "doc_1",
      doctorName: "Dra. Ana Silva",
      doctorCrm: "12345/PE",
      medicationName: "Losartana",
      dosageMg: "50 mg",
      dailyInstructions: "Tomar 1 comprimido pela manha.",
      createdAt: "2026-11-22T12:00:00.000Z",
    };

    expect(
      matchesPatientPrescription(sample, {
        id: "user_99",
        name: "JOSE ALVARO",
      })
    ).toBe(true);

    expect(
      matchesPatientPrescription(sample, {
        id: "user_99",
        name: "Maria Oliveira",
      })
    ).toBe(false);
  });

  it("cria receita via servico e lista para o paciente e medico correspondentes", async () => {
    const created = await prescriptionService.create({
      patientId: "patient_10",
      patientName: "Maria Oliveira",
      doctorId: "doc_5",
      doctorName: "Dr. Carlos Mendes",
      doctorCrm: "98765/PE",
      medicationName: "Dipirona Sodica",
      dosageMg: "500",
      dailyInstructions: "Tomar 1 comprimido a cada 6 horas se houver dor.",
    });

    expect(created.dosageMg).toBe("500 mg");

    const byPatient = await prescriptionService.listByPatient({
      id: "patient_10",
      name: "Maria Oliveira",
    });
    expect(byPatient).toHaveLength(1);
    expect(byPatient[0].medicationName).toBe("Dipirona Sodica");

    const byDoctor = await prescriptionService.listByDoctor("doc_5");
    expect(byDoctor).toHaveLength(1);

    const otherPatient = await prescriptionService.listByPatient({
      id: "patient_other",
      name: "Joao Souza",
    });
    expect(otherPatient).toHaveLength(0);
  });
});

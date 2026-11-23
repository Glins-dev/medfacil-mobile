import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => {
  const storage = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  };
});

import {
  calculateBmi,
  healthProfileSchema,
  parseHeightCmInput,
  parseWeightInput,
} from "@/schemas/healthProfile.schema";
import { healthProfileService } from "@/services/healthProfile.service";
import {
  findMatchingHealthProfile,
  useHealthProfileStore,
} from "@/stores/healthProfile.store";

describe("healthProfileSchema e normalizacao de medidas", () => {
  const basePayload = {
    weightKg: "72,5",
    heightCm: "170",
    bloodType: "O+" as const,
    comorbidities: ["Hipertensão arterial"],
    specialConditions: "Cirurgia prévia sem intercorrências.",
    allergies: ["Dipirona"],
    otherAllergies: "",
  };

  it("aceita dados validos com virgula ou ponto decimal e converte altura em metros", () => {
    const parsedComma = healthProfileSchema.safeParse(basePayload);
    expect(parsedComma.success).toBe(true);
    expect(parseWeightInput("72,5")).toBe(72.5);
    expect(parseWeightInput("72.5")).toBe(72.5);
    expect(parseHeightCmInput("170")).toBe(170);
    expect(parseHeightCmInput("1,70")).toBe(170);
    expect(parseHeightCmInput("1.75")).toBe(175);

    const parsedDot = healthProfileSchema.safeParse({
      ...basePayload,
      weightKg: "68.4",
      heightCm: "1.68",
      bloodType: "Não sei informar" as const,
    });
    expect(parsedDot.success).toBe(true);
  });

  it("rejeita peso ou altura negativos, absurdos e tipo sanguineo invalido", () => {
    const negativeWeight = healthProfileSchema.safeParse({
      ...basePayload,
      weightKg: "-5",
    });
    expect(negativeWeight.success).toBe(false);
    if (!negativeWeight.success) {
      expect(negativeWeight.error.issues[0]?.path).toEqual(["weightKg"]);
    }

    const hugeWeight = healthProfileSchema.safeParse({
      ...basePayload,
      weightKg: "500",
    });
    expect(hugeWeight.success).toBe(false);

    const tinyHeight = healthProfileSchema.safeParse({
      ...basePayload,
      heightCm: "10",
    });
    expect(tinyHeight.success).toBe(false);
    if (!tinyHeight.success) {
      expect(tinyHeight.error.issues[0]?.path).toEqual(["heightCm"]);
    }

    const hugeHeight = healthProfileSchema.safeParse({
      ...basePayload,
      heightCm: "320",
    });
    expect(hugeHeight.success).toBe(false);

    const invalidBlood = healthProfileSchema.safeParse({
      ...basePayload,
      bloodType: "X+",
    });
    expect(invalidBlood.success).toBe(false);

    const longNotes = healthProfileSchema.safeParse({
      ...basePayload,
      specialConditions: "a".repeat(501),
    });
    expect(longNotes.success).toBe(false);
  });
});

describe("calculateBmi", () => {
  it("calcula IMC arredondado com uma casa decimal para valores validos", () => {
    expect(calculateBmi(72.5, 170)).toBe(25.1);
    expect(calculateBmi(60, 160)).toBe(23.4);
  });

  it("retorna null quando peso ou altura estiverem ausentes ou invalidos", () => {
    expect(calculateBmi(null, 170)).toBeNull();
    expect(calculateBmi(72.5, null)).toBeNull();
    expect(calculateBmi(undefined, 170)).toBeNull();
    expect(calculateBmi(0, 170)).toBeNull();
    expect(calculateBmi(70, -170)).toBeNull();
  });
});

describe("healthProfileService e correspondencia do paciente", () => {
  beforeEach(() => {
    useHealthProfileStore.getState().clearProfiles();
  });

  it("salva o pre-prontuario e localiza por id ou nome normalizado", async () => {
    const saved = await healthProfileService.save({
      patientId: "patient-42",
      patientName: "José da Silva",
      weightKg: 78.4,
      heightCm: 175,
      bloodType: "A+",
      comorbidities: ["Hipertensão arterial", "Hipertensão arterial"],
      specialConditions: "Histórico de AVC leve em 2022.",
      allergies: ["Dipirona", "Sulfa"],
      otherAllergies: "Corante amarelo tartrazina",
    });

    expect(saved.comorbidities).toEqual(["Hipertensão arterial"]);
    expect(saved.updatedAt).toBeTruthy();

    const byId = await healthProfileService.getByPatient({
      patientId: "patient-42",
    });
    expect(byId?.bloodType).toBe("A+");

    const byNormalizedName = findMatchingHealthProfile(
      useHealthProfileStore.getState().profiles,
      {
        patientId: null,
        patientName: "  jose da silva ",
      }
    );
    expect(byNormalizedName?.patientId).toBe("patient-42");
    expect(byNormalizedName?.allergies).toEqual(["Dipirona", "Sulfa"]);
  });
});

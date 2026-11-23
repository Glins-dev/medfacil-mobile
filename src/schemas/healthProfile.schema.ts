import { z } from "zod";

import { BLOOD_TYPE_OPTIONS } from "@/types/healthProfile";

const POSITIVE_DECIMAL_PATTERN = /^\d+(?:[.,]\d+)?$/;

// Normaliza string ou numero para peso positivo entre 1 kg e 400 kg.
export function parseWeightInput(
  raw: string | number | null | undefined
): number | null {
  if (raw === null || raw === undefined) return null;

  let value: number;
  if (typeof raw === "number") {
    value = raw;
  } else {
    const trimmed = raw.trim();
    if (!trimmed || !POSITIVE_DECIMAL_PATTERN.test(trimmed)) {
      return null;
    }
    value = Number(trimmed.replace(",", "."));
  }

  if (!Number.isFinite(value) || value < 1 || value > 400) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

// Normaliza altura em cm (30 a 250 cm), convertendo entradas em metros com separador decimal (ex.: 1,70).
export function parseHeightCmInput(
  raw: string | number | null | undefined
): number | null {
  if (raw === null || raw === undefined) return null;

  let cmValue: number;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    cmValue = raw >= 0.3 && raw <= 2.5 ? raw * 100 : raw;
  } else {
    const trimmed = raw.trim();
    if (!trimmed || !POSITIVE_DECIMAL_PATTERN.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    const hasDecimal = trimmed.includes(",") || trimmed.includes(".");
    cmValue =
      hasDecimal && parsed >= 0.3 && parsed <= 2.5 ? parsed * 100 : parsed;
  }

  if (!Number.isFinite(cmValue) || cmValue < 30 || cmValue > 250) {
    return null;
  }

  return Math.round(cmValue * 10) / 10;
}

// Calcula IMC com uma casa decimal ou retorna null quando peso ou altura estiverem ausentes/invalidos.
export function calculateBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): number | null {
  if (
    weightKg === null ||
    weightKg === undefined ||
    heightCm === null ||
    heightCm === undefined ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null;
}

// Formata numero decimal usando virgula brasileira para preenchimento inicial dos inputs.
export function formatDecimalBr(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}

export const healthProfileSchema = z.object({
  weightKg: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || parseWeightInput(val) !== null,
      "Informe um peso válido entre 1 e 400 kg."
    ),
  heightCm: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || parseHeightCmInput(val) !== null,
      "Informe uma altura válida entre 30 e 250 cm."
    ),
  bloodType: z.enum(BLOOD_TYPE_OPTIONS, {
    error: "Selecione uma opção para tipo sanguíneo.",
  }),
  comorbidities: z.array(z.string()),
  specialConditions: z
    .string()
    .trim()
    .max(500, "Máximo de 500 caracteres."),
  allergies: z.array(z.string()),
  otherAllergies: z
    .string()
    .trim()
    .max(500, "Máximo de 500 caracteres."),
});

export type HealthProfileFormData = z.infer<typeof healthProfileSchema>;

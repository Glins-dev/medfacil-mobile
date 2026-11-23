import { z } from "zod";

const DOSAGE_MG_PATTERN = /^\d+(?:[.,]\d+)?(?:\s*mg)?$/i;

// Normaliza o texto de dosagem para exibir sempre a unidade mg.
export function formatDosageMg(raw: string): string {
  const cleaned = raw.trim().replace(/\s*mg$/i, "").trim();
  if (!cleaned) return "";
  return `${cleaned} mg`;
}

// Validacao dos tres campos obrigatorios da receita medica sem anexos.
export const prescriptionSchema = z.object({
  medicationName: z
    .string()
    .trim()
    .min(2, "Informe o nome do medicamento")
    .max(120, "Nome do medicamento muito longo"),
  dosageMg: z
    .string()
    .trim()
    .min(1, "Informe a dosagem em mg")
    .refine((value) => {
      if (!DOSAGE_MG_PATTERN.test(value)) return false;
      const numericPart = Number(
        value.replace(/\s*mg$/i, "").replace(",", ".")
      );
      return Number.isFinite(numericPart) && numericPart > 0;
    }, "Informe um valor válido em mg (ex.: 500)"),
  dailyInstructions: z
    .string()
    .trim()
    .min(5, "Descreva como tomar por dia")
    .max(500, "Instruções muito longas"),
});

export type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

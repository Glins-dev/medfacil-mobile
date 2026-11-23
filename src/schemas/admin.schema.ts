import { z } from "zod";

import { isValidCpf, onlyDigits } from "@/utils/cpf";
import { isValidCrm } from "@/utils/masks";

export const createSpecialtySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome da especialidade.")
    .max(80, "Nome muito longo."),
  description: z.string().trim().max(200, "Descrição muito longa."),
});

export type CreateSpecialtyFormData = z.infer<typeof createSpecialtySchema>;

export const createDoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome completo.")
    .max(120, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .min(1, "Informe um e-mail válido.")
    .email("Informe um e-mail válido."),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório.")
    .refine(isValidCpf, "CPF inválido."),
  phone: z
    .string()
    .min(1, "Informe o DDD e o telefone.")
    .refine((value) => {
      const len = onlyDigits(value).length;
      return len === 10 || len === 11;
    }, "Informe o DDD e o telefone."),
  crm: z
    .string()
    .trim()
    .min(1, "CRM é obrigatório.")
    .refine(isValidCrm, "Use o formato 12345/PE."),
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres.")
    .max(72, "Máximo de 72 caracteres."),
  specialtyIds: z
    .array(z.string())
    .min(1, "Selecione ao menos uma especialidade.")
    .max(10, "Selecione no máximo 10 especialidades."),
});

export type CreateDoctorFormData = z.infer<typeof createDoctorSchema>;

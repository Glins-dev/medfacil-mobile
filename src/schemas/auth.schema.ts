import { z } from "zod";

import { USER_SEX_OPTIONS, type UserSex } from "@/types/user";
import { isValidCpf, onlyDigits } from "@/utils/cpf";
import { isValidDate } from "@/utils/date";

export { USER_SEX_OPTIONS, type UserSex };

export const loginSchema = z.object({
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .refine(isValidCpf, "CPF inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo.")
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
    birthDate: z
      .string()
      .min(1, "Informe sua data de nascimento.")
      .refine(isValidDate, "Use o formato DD/MM/AAAA."),
    sexo: z.enum(USER_SEX_OPTIONS, {
      error: "Selecione uma opção para gênero.",
    }),
    endereco: z
      .string({ error: "Informe seu endereço completo." })
      .trim()
      .min(
        10,
        "Informe o endereço completo (rua, número, bairro, cidade e estado)."
      )
      .max(240, "Endereço muito longo."),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres.")
      .max(72, "Máximo de 72 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

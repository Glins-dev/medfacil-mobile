import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/schemas/auth.schema";

describe("loginSchema", () => {
  it("aceita CPF valido e senha preenchida", () => {
    const parsed = loginSchema.safeParse({
      cpf: "529.982.247-25",
      password: "Password123",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita CPF invalido ou senha vazia", () => {
    const invalidCpf = loginSchema.safeParse({
      cpf: "111.111.111-11",
      password: "Password123",
    });
    expect(invalidCpf.success).toBe(false);

    const emptyPassword = loginSchema.safeParse({
      cpf: "52998224725",
      password: "",
    });
    expect(emptyPassword.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const validPayload = {
    name: "Maria da Silva",
    email: "maria@medfacil.com",
    cpf: "529.982.247-25",
    phone: "(81) 99999-8888",
    birthDate: "15/05/1990",
    password: "Password123",
    confirmPassword: "Password123",
  };

  it("aceita dados completos validos de autocadastro", () => {
    const parsed = registerSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("rejeita e-mail invalido, telefone curto e data invalida", () => {
    const badEmail = registerSchema.safeParse({
      ...validPayload,
      email: "email-invalido",
    });
    expect(badEmail.success).toBe(false);

    const badPhone = registerSchema.safeParse({
      ...validPayload,
      phone: "(81) 9999",
    });
    expect(badPhone.success).toBe(false);

    const badDate = registerSchema.safeParse({
      ...validPayload,
      birthDate: "31/02/1990",
    });
    expect(badDate.success).toBe(false);
  });

  it("rejeita senhas curtas ou divergentes na confirmacao", () => {
    const shortPassword = registerSchema.safeParse({
      ...validPayload,
      password: "123",
      confirmPassword: "123",
    });
    expect(shortPassword.success).toBe(false);

    const mismatch = registerSchema.safeParse({
      ...validPayload,
      confirmPassword: "OutraSenha123",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

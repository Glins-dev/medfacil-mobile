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
    sexo: "Feminino" as const,
    endereco: "Rua das Flores, 123, Boa Vista, Recife, PE",
    password: "Password123",
    confirmPassword: "Password123",
  };

  it("aceita dados completos validos de autocadastro", () => {
    const parsed = registerSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("aceita todas as opcoes validas do campo sexo", () => {
    for (const sexo of ["Masculino", "Feminino", "Não informar"] as const) {
      const parsed = registerSchema.safeParse({
        ...validPayload,
        sexo,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejeita valor invalido ou ausente para o campo sexo", () => {
    const invalidOption = registerSchema.safeParse({
      ...validPayload,
      sexo: "Outro",
    });
    expect(invalidOption.success).toBe(false);
    if (!invalidOption.success) {
      expect(invalidOption.error.issues[0]?.path).toEqual(["sexo"]);
    }

    const emptyOption = registerSchema.safeParse({
      ...validPayload,
      sexo: "",
    });
    expect(emptyOption.success).toBe(false);
    if (!emptyOption.success) {
      expect(emptyOption.error.issues[0]?.path).toEqual(["sexo"]);
    }

    const { sexo: _omitted, ...missingSexo } = validPayload;
    const omittedOption = registerSchema.safeParse(missingSexo);
    expect(omittedOption.success).toBe(false);
    if (!omittedOption.success) {
      expect(omittedOption.error.issues[0]?.path).toEqual(["sexo"]);
    }
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

  it("valida o campo endereco exigindo endereco completo", () => {
    const emptyAddress = registerSchema.safeParse({
      ...validPayload,
      endereco: "   ",
    });
    expect(emptyAddress.success).toBe(false);
    if (!emptyAddress.success) {
      expect(emptyAddress.error.issues[0]?.path).toEqual(["endereco"]);
    }

    const shortAddress = registerSchema.safeParse({
      ...validPayload,
      endereco: "Rua A, 1",
    });
    expect(shortAddress.success).toBe(false);
    if (!shortAddress.success) {
      expect(shortAddress.error.issues[0]?.path).toEqual(["endereco"]);
    }

    const validWithPadding = registerSchema.safeParse({
      ...validPayload,
      endereco: "  Av. Conde da Boa Vista, 500, Recife, PE  ",
    });
    expect(validWithPadding.success).toBe(true);
    if (validWithPadding.success) {
      expect(validWithPadding.data.endereco).toBe(
        "Av. Conde da Boa Vista, 500, Recife, PE"
      );
    }
  });
});

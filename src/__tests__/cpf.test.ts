import { describe, expect, it } from "vitest";

import { isValidCpf, maskCpf, onlyDigits } from "@/utils/cpf";

describe("onlyDigits", () => {
  it("remove todos os caracteres nao numericos", () => {
    expect(onlyDigits("123.456.789-01")).toBe("12345678901");
    expect(onlyDigits("(81) 99999-8888")).toBe("81999998888");
    expect(onlyDigits("abc")).toBe("");
  });
});

describe("maskCpf", () => {
  it("aplica mascara progressiva e limita em 11 digitos", () => {
    expect(maskCpf("")).toBe("");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("12345678901")).toBe("123.456.789-01");
    expect(maskCpf("123456789019999")).toBe("123.456.789-01");
  });
});

describe("isValidCpf", () => {
  it("aceita CPFs validos formatados ou apenas com digitos", () => {
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("rejeita sequencias repetidas, tamanhos invalidos e digitos incorretos", () => {
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});

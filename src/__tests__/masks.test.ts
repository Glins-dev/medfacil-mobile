import { describe, expect, it } from "vitest";

import {
  isValidBirthDate,
  isValidCrm,
  maskCrm,
  maskDate,
  maskPhone,
} from "@/utils/masks";

describe("maskPhone", () => {
  it("formata telefones fixos e celulares brasileiros", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("81")).toBe("(81");
    expect(maskPhone("8133334444")).toBe("(81) 3333-4444");
    expect(maskPhone("81999998888")).toBe("(81) 99999-8888");
    expect(maskPhone("81999998888000")).toBe("(81) 99999-8888");
  });
});

describe("maskCrm e isValidCrm", () => {
  it("formata CRM com ate 7 digitos seguidos da UF em maiusculas", () => {
    expect(maskCrm("12345pe")).toBe("12345/PE");
    expect(maskCrm("1234567sp99")).toBe("1234567/SP");
    expect(maskCrm("123")).toBe("123");
  });

  it("valida formato de CRM com 4 a 7 digitos e UF", () => {
    expect(isValidCrm("1234/PE")).toBe(true);
    expect(isValidCrm("12345/pe")).toBe(true);
    expect(isValidCrm("1234567/SP")).toBe(true);
    expect(isValidCrm("123/PE")).toBe(false);
    expect(isValidCrm("12345/P")).toBe(false);
    expect(isValidCrm("12345PE")).toBe(false);
  });
});

describe("maskDate e isValidBirthDate", () => {
  it("aplica mascara DD/MM/AAAA", () => {
    expect(maskDate("01021990")).toBe("01/02/1990");
    expect(maskDate("0102")).toBe("01/02");
  });

  it("valida datas reais de nascimento", () => {
    expect(isValidBirthDate("29/02/2000")).toBe(true);
    expect(isValidBirthDate("29/02/2001")).toBe(false);
    expect(isValidBirthDate("31/04/1995")).toBe(false);
    expect(isValidBirthDate("01/01/1899")).toBe(false);
    expect(isValidBirthDate("01/01/2099")).toBe(false);
  });
});

import { onlyDigits } from "@/utils/cpf";
export { maskCpf } from "@/utils/cpf";

const CRM_PATTERN = /^\d{4,7}\/[A-Z]{2}$/;

/** Formata telefone brasileiro no padrão (81) 99999-9999 ou (81) 9999-9999. */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Formata CRM no padrão 12345/PE: até 7 dígitos seguidos de "/" e UF (2 letras). */
export function maskCrm(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const digits = (/^\d*/.exec(clean)?.[0] ?? "").slice(0, 7);
  const uf = clean
    .slice(digits.length)
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
  return uf ? `${digits}/${uf}` : digits;
}

/** Valida CRM no formato 4 a 7 dígitos + barra + UF (ex.: 12345/PE). */
export function isValidCrm(value: string): boolean {
  return CRM_PATTERN.test(value.trim().toUpperCase());
}

/** Aplica máscara DD/MM/AAAA para datas digitadas. */
export function maskDate(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

/** Valida data real de nascimento no formato DD/MM/AAAA (>= 1900 e não futura). */
export function isValidBirthDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const [, dd, mm, yyyy] = match.map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return (
    yyyy >= 1900 &&
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd &&
    date <= new Date()
  );
}

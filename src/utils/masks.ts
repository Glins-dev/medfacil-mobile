import { onlyDigits } from "@/utils/cpf";

// (81) 99999-9999 ou (81) 9999-9999
export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// DD/MM/AAAA
export function maskDate(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

export function isValidBirthDate(value: string) {
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

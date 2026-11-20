import { onlyDigits } from "@/utils/cpf";

export const CLINIC_TZ = "America/Recife";

export type DayPeriod = "Manhã" | "Tarde" | "Noite";

export interface DateDescription {
  weekday: string;
  weekdayLong: string;
  day: number;
  month: string;
  monthLong: string;
  dayMonth: string;
  long: string;
}

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: CLINIC_TZ,
});

const weekdayLongClinicFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  timeZone: CLINIC_TZ,
});

const dayClinicFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  timeZone: CLINIC_TZ,
});

const monthLongClinicFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: CLINIC_TZ,
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
  timeZone: CLINIC_TZ,
});

const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
  timeZone: CLINIC_TZ,
});

const clinicDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayUtcFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: "UTC",
});

const weekdayLongUtcFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  timeZone: "UTC",
});

const monthUtcFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

const monthLongUtcFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

const longUtcFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "UTC",
});

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getClinicDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = clinicDatePartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

// Formata um instante ISO UTC por extenso no fuso da clinica (ex.: "10 de outubro de 2026").
export function formatLongDate(iso: string): string {
  return longDateFormatter.format(new Date(iso));
}

// Formata o dia da semana por extenso com inicial maiuscula no fuso da clinica (ex.: "Segunda-feira").
export function formatWeekdayLong(iso: string): string {
  return capitalizeFirst(weekdayLongClinicFormatter.format(new Date(iso)));
}

// Formata dia e mes com inicial maiuscula no fuso da clinica (ex.: "24 de Novembro").
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  const day = dayClinicFormatter.format(date);
  const month = capitalizeFirst(monthLongClinicFormatter.format(date));
  return `${day} de ${month}`;
}

// Formata hora "HH:mm" (24h) de um instante ISO UTC no fuso da clinica.
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

// Retorna o periodo do dia ("Manha", "Tarde" ou "Noite") no fuso da clinica.
export function getPeriod(iso: string): DayPeriod {
  const parts = hourFormatter.formatToParts(new Date(iso));
  const hourValue = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(hourValue) % 24;

  if (hour < 12) return "Manhã";
  if (hour < 18) return "Tarde";
  return "Noite";
}

// Proximos N dias, a partir de hoje, no horario da clinica ("AAAA-MM-DD").
export function getUpcomingDates(count: number): string[] {
  const { year, month, day } = getClinicDateParts(new Date());

  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(year, month - 1, day + i)).toISOString().slice(0, 10)
  );
}

// Textos localizados de uma data "AAAA-MM-DD" calculados em UTC sem deslocar o dia.
export function describeDate(date: string): DateDescription {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const weekdayLong = capitalizeFirst(weekdayLongUtcFormatter.format(utc));
  const monthLong = capitalizeFirst(monthLongUtcFormatter.format(utc));

  return {
    weekday: weekdayUtcFormatter.format(utc).replace(/\.$/, ""),
    weekdayLong,
    day: d,
    month: monthUtcFormatter.format(utc).replace(/\.$/, ""),
    monthLong,
    dayMonth: `${d} de ${monthLong}`,
    long: longUtcFormatter.format(utc),
  };
}

// Retorna "AAAA-MM-DD" de um instante ISO UTC no horario da clinica.
export function getClinicDateKey(iso: string): string {
  const { year, month, day } = getClinicDateParts(new Date(iso));
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Titulo de um dia "AAAA-MM-DD": "Hoje · ...", "Amanha · ..." ou apenas a data por extenso.
export function describeDayHeading(dateKey: string): string {
  const today = getClinicDateKey(new Date().toISOString());
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);

  const { long } = describeDate(dateKey);
  if (dateKey === today) return `Hoje · ${long}`;
  if (dateKey === tomorrow) return `Amanhã · ${long}`;
  return long;
}

// Aplica mascara DD/MM/AAAA para datas digitadas.
export function maskDate(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

// Valida data real no formato DD/MM/AAAA (>= 1900 e nao futura).
export function isValidDate(value: string): boolean {
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

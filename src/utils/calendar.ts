import { describeDate, formatTime, getClinicDateKey } from "@/utils/date";

export type CalendarViewMode = "day" | "week" | "month";

export const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const WEEKDAY_SHORT_LABELS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

const SHORT_MONTH_LABELS = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
] as const;

const FULL_MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export interface CalendarWeekDay {
  dateKey: string;
  day: number;
  weekdayIndex: number;
  shortLabel: string;
  initial: string;
  isToday: boolean;
}

export interface MonthCalendarCell {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface TimelinePositionedEvent<T> {
  item: T;
  startMinutes: number;
  column: number;
  totalColumns: number;
}

// Extrai ano, mes (1..12) e dia de uma chave "YYYY-MM-DD".
export function parseDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y = 2026, m = 1, d = 1] = dateKey.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatDateParts(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${mm}-${dd}`;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day + deltaDays))
    .toISOString()
    .slice(0, 10);
}

// Retorna a data atual "YYYY-MM-DD" no fuso horario America/Recife.
export function getTodayKeyRecife(referenceDate: Date = new Date()): string {
  return getClinicDateKey(referenceDate.toISOString());
}

// Retorna os minutos desde 00:00 no horario atual de America/Recife.
export function getCurrentMinutesRecife(
  referenceDate: Date = new Date()
): number {
  return parseTimeToMinutes(formatTime(referenceDate.toISOString()));
}

// Converte horario "HH:mm" em minutos desde 00:00.
export function parseTimeToMinutes(timeStr: string): number {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Retorna os 7 dias (domingo a sabado) da semana que contem referenceDateKey.
export function getWeekDays(
  referenceDateKey: string,
  todayKey: string = getTodayKeyRecife()
): CalendarWeekDay[] {
  const { year, month, day } = parseDateKey(referenceDateKey);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const sundayKey = addDaysToDateKey(referenceDateKey, -weekday);

  return Array.from({ length: 7 }, (_, index) => {
    const cellKey = addDaysToDateKey(sundayKey, index);
    const parts = parseDateKey(cellKey);
    return {
      dateKey: cellKey,
      day: parts.day,
      weekdayIndex: index,
      shortLabel: WEEKDAY_SHORT_LABELS[index],
      initial: WEEKDAY_INITIALS[index],
      isToday: cellKey === todayKey,
    };
  });
}

// Retorna matriz mensal completa de semanas (35 ou 42 celulas) de domingo a sabado.
export function getMonthCalendarGrid(
  year: number,
  month: number,
  todayKey: string = getTodayKeyRecife()
): MonthCalendarCell[][] {
  const firstDayKey = formatDateParts(year, month, 1);
  const startOffset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = startOffset + daysInMonth <= 35 ? 35 : 42;
  const gridStartKey = addDaysToDateKey(firstDayKey, -startOffset);

  const cells: MonthCalendarCell[] = Array.from(
    { length: totalCells },
    (_, index) => {
      const cellKey = addDaysToDateKey(gridStartKey, index);
      const parts = parseDateKey(cellKey);
      return {
        dateKey: cellKey,
        day: parts.day,
        isCurrentMonth: parts.year === year && parts.month === month,
        isToday: cellKey === todayKey,
      };
    }
  );

  const weeks: MonthCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// Avanca ou recua a data de referencia em 1 dia, 1 semana ou 1 mes preservando o fim do mes.
export function shiftReferenceDate(
  dateKey: string,
  viewMode: CalendarViewMode,
  direction: -1 | 1
): string {
  if (viewMode === "day") {
    return addDaysToDateKey(dateKey, direction);
  }
  if (viewMode === "week") {
    return addDaysToDateKey(dateKey, direction * 7);
  }

  const { year, month, day } = parseDateKey(dateKey);
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + direction, 1));
  const targetYear = firstOfTarget.getUTCFullYear();
  const targetMonth = firstOfTarget.getUTCMonth() + 1;
  const maxDayInMonth = new Date(
    Date.UTC(targetYear, targetMonth, 0)
  ).getUTCDate();

  return formatDateParts(targetYear, targetMonth, Math.min(day, maxDayInMonth));
}

// Agrupa consultas pela data local em America/Recife mantendo ordem cronologica.
export function groupAppointmentsByDate<T extends { dateTime: string }>(
  appointments: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  const sorted = [...appointments].sort((a, b) =>
    a.dateTime.localeCompare(b.dateTime)
  );

  for (const item of sorted) {
    const key = getClinicDateKey(item.dateTime);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  return grouped;
}

// Calcula a janela horaria visivel da timeline expandindo se houver consultas fora de 07:00-20:00.
export function computeTimelineHourRange(
  appointments: Array<{ dateTime: string }>,
  defaultStartHour = 7,
  defaultEndHour = 20
): { startHour: number; endHour: number; hours: number[] } {
  let startHour = defaultStartHour;
  let endHour = defaultEndHour;

  for (const appt of appointments) {
    const minutes = parseTimeToMinutes(formatTime(appt.dateTime));
    const hour = Math.floor(minutes / 60);
    if (hour < startHour) startHour = Math.max(0, hour);
    if (hour >= endHour) endHour = Math.min(23, hour + 1);
  }

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, idx) => startHour + idx
  );

  return { startHour, endHour, hours };
}

// Distribui consultas simultaneas ou sobrepostas em colunas lado a lado na linha do tempo.
export function assignOverlapColumns<T extends { id: string; dateTime: string }>(
  appointments: T[],
  durationMinutes = 50
): TimelinePositionedEvent<T>[] {
  if (appointments.length === 0) return [];

  const entries = [...appointments]
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .map((item) => {
      const startMinutes = parseTimeToMinutes(formatTime(item.dateTime));
      return {
        item,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
      };
    });

  const clusters: Array<typeof entries> = [];
  let currentCluster: typeof entries = [];
  let clusterMaxEnd = -1;

  for (const entry of entries) {
    if (currentCluster.length === 0 || entry.startMinutes < clusterMaxEnd) {
      currentCluster.push(entry);
      clusterMaxEnd = Math.max(clusterMaxEnd, entry.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [entry];
      clusterMaxEnd = entry.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positioned: TimelinePositionedEvent<T>[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const assigned: Array<{
      item: T;
      startMinutes: number;
      column: number;
    }> = [];

    for (const entry of cluster) {
      let colIndex = columnEnds.findIndex(
        (colEnd) => colEnd <= entry.startMinutes
      );
      if (colIndex === -1) {
        colIndex = columnEnds.length;
        columnEnds.push(entry.endMinutes);
      } else {
        columnEnds[colIndex] = entry.endMinutes;
      }
      assigned.push({
        item: entry.item,
        startMinutes: entry.startMinutes,
        column: colIndex,
      });
    }

    const totalColumns = Math.max(1, columnEnds.length);
    for (const placed of assigned) {
      positioned.push({
        item: placed.item,
        startMinutes: placed.startMinutes,
        column: placed.column,
        totalColumns,
      });
    }
  }

  return positioned;
}

// Formata o titulo do periodo selecionado para Dia, Semana ou Mes em portugues.
export function formatPeriodTitle(
  dateKey: string,
  viewMode: CalendarViewMode
): string {
  const { year, month } = parseDateKey(dateKey);

  if (viewMode === "month") {
    const monthLabel = FULL_MONTH_LABELS[month - 1] ?? "Mês";
    return `${monthLabel} de ${year}`;
  }

  if (viewMode === "day") {
    const info = describeDate(dateKey);
    return `${info.day} de ${info.monthLong.toLowerCase()} de ${year}`;
  }

  const week = getWeekDays(dateKey);
  const first = week[0];
  const last = week[week.length - 1];
  if (!first || !last) return `${year}`;

  const firstParts = parseDateKey(first.dateKey);
  const lastParts = parseDateKey(last.dateKey);
  const firstMonth = SHORT_MONTH_LABELS[firstParts.month - 1] ?? "";
  const lastMonth = SHORT_MONTH_LABELS[lastParts.month - 1] ?? "";

  if (
    firstParts.year === lastParts.year &&
    firstParts.month === lastParts.month
  ) {
    return `${firstParts.day} a ${lastParts.day} ${lastMonth} ${lastParts.year}`;
  }

  if (firstParts.year === lastParts.year) {
    return `${firstParts.day} ${firstMonth} a ${lastParts.day} ${lastMonth} ${lastParts.year}`;
  }

  return `${firstParts.day} ${firstMonth} ${firstParts.year} a ${lastParts.day} ${lastMonth} ${lastParts.year}`;
}

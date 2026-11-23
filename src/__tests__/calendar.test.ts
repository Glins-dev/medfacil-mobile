import { describe, expect, it } from "vitest";

import {
  assignOverlapColumns,
  computeTimelineHourRange,
  formatPeriodTitle,
  getMonthCalendarGrid,
  getTodayKeyRecife,
  getWeekDays,
  groupAppointmentsByDate,
  parseTimeToMinutes,
  shiftReferenceDate,
} from "@/utils/calendar";

describe("utilitarios de calendario em America/Recife", () => {
  it("calcula data atual em Recife respeitando diferenca UTC-3", () => {
    // 2026-11-24T01:30:00Z corresponde a 2026-11-23 22:30 em America/Recife.
    const utcLateNight = new Date("2026-11-24T01:30:00.000Z");
    expect(getTodayKeyRecife(utcLateNight)).toBe("2026-11-23");
  });

  it("gera os 7 dias da semana de domingo a sabado marcando o dia atual", () => {
    const week = getWeekDays("2026-11-25", "2026-11-23");
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({
      dateKey: "2026-11-22",
      day: 22,
      shortLabel: "Dom",
      initial: "D",
      isToday: false,
    });
    expect(week[1]).toMatchObject({
      dateKey: "2026-11-23",
      day: 23,
      shortLabel: "Seg",
      isToday: true,
    });
    expect(week[6]).toMatchObject({
      dateKey: "2026-11-28",
      day: 28,
      shortLabel: "Sáb",
      initial: "S",
      isToday: false,
    });
  });

  it("gera matriz mensal completa com 35 ou 42 celulas e flags de mes e hoje", () => {
    // Fevereiro de 2026 comeca no domingo e tem 28 dias, devendo preencher 35 celulas.
    const feb2026 = getMonthCalendarGrid(2026, 2, "2026-02-14");
    expect(feb2026).toHaveLength(5);
    expect(feb2026.flat()).toHaveLength(35);
    expect(feb2026[0]?.[0]?.dateKey).toBe("2026-02-01");
    expect(feb2026[1]?.[6]).toMatchObject({
      dateKey: "2026-02-14",
      isCurrentMonth: true,
      isToday: true,
    });
    expect(feb2026[4]?.[6]).toMatchObject({
      dateKey: "2026-03-07",
      isCurrentMonth: false,
    });

    // Agosto de 2026 comeca no sabado e tem 31 dias (6 semanas = 42 celulas).
    const aug2026 = getMonthCalendarGrid(2026, 8, "2026-08-01");
    expect(aug2026).toHaveLength(6);
    expect(aug2026.flat()).toHaveLength(42);
    expect(aug2026[0]?.[0]?.isCurrentMonth).toBe(false);
    expect(aug2026[0]?.[6]).toMatchObject({
      dateKey: "2026-08-01",
      isCurrentMonth: true,
      isToday: true,
    });
  });

  it("avanca e recua datas corretamente para dia, semana e mes", () => {
    expect(shiftReferenceDate("2026-11-23", "day", 1)).toBe("2026-11-24");
    expect(shiftReferenceDate("2026-11-23", "day", -1)).toBe("2026-11-22");
    expect(shiftReferenceDate("2026-11-23", "week", 1)).toBe("2026-11-30");
    expect(shiftReferenceDate("2026-11-23", "week", -1)).toBe("2026-11-16");
    expect(shiftReferenceDate("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(shiftReferenceDate("2026-03-31", "month", -1)).toBe("2026-02-28");
  });

  it("agrupa consultas por data em Recife ordenadas por horario e converte minutos", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("20:45")).toBe(1245);
    expect(parseTimeToMinutes("invalido")).toBe(0);

    const grouped = groupAppointmentsByDate([
      {
        id: "a2",
        dateTime: new Date("2026-11-23T14:00:00-03:00").toISOString(),
      },
      {
        id: "a1",
        dateTime: new Date("2026-11-23T09:00:00-03:00").toISOString(),
      },
      {
        id: "a3",
        dateTime: new Date("2026-11-24T22:00:00-03:00").toISOString(),
      },
    ]);

    expect(Object.keys(grouped)).toEqual(["2026-11-23", "2026-11-24"]);
    expect(grouped["2026-11-23"]?.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(grouped["2026-11-24"]?.map((a) => a.id)).toEqual(["a3"]);
  });

  it("expande faixa horaria e distribui consultas simultaneas sem sobreposicao", () => {
    const events = [
      {
        id: "early",
        dateTime: new Date("2026-11-23T06:15:00-03:00").toISOString(),
      },
      {
        id: "same-1",
        dateTime: new Date("2026-11-23T10:00:00-03:00").toISOString(),
      },
      {
        id: "same-2",
        dateTime: new Date("2026-11-23T10:20:00-03:00").toISOString(),
      },
      {
        id: "late",
        dateTime: new Date("2026-11-23T21:10:00-03:00").toISOString(),
      },
    ];

    const range = computeTimelineHourRange(events, 7, 20);
    expect(range.startHour).toBe(6);
    expect(range.endHour).toBe(22);

    const positioned = assignOverlapColumns(events);
    const same1 = positioned.find((p) => p.item.id === "same-1");
    const same2 = positioned.find((p) => p.item.id === "same-2");
    expect(same1?.totalColumns).toBe(2);
    expect(same2?.totalColumns).toBe(2);
    expect(same1?.column).not.toBe(same2?.column);

    expect(formatPeriodTitle("2026-11-23", "month")).toBe("Novembro de 2026");
    expect(formatPeriodTitle("2026-11-23", "week")).toBe("22 a 28 nov. 2026");
  });
});

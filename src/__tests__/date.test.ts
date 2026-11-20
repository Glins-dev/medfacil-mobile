import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLINIC_TZ,
  describeDate,
  describeDayHeading,
  formatLongDate,
  formatTime,
  getClinicDateKey,
  getPeriod,
  getUpcomingDates,
  isValidDate,
  maskDate,
} from "@/utils/date";

describe("date utils no fuso America/Recife", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("usa o fuso horario America/Recife", () => {
    expect(CLINIC_TZ).toBe("America/Recife");
  });

  it("converte instantes UTC para data e hora de Recife", () => {
    const lateUtc = "2026-10-10T01:30:00.000Z";
    expect(getClinicDateKey(lateUtc)).toBe("2026-10-09");
    expect(formatTime(lateUtc)).toBe("22:30");
    expect(getPeriod(lateUtc)).toBe("Noite");

    const morningUtc = "2026-10-10T12:30:00.000Z";
    expect(getClinicDateKey(morningUtc)).toBe("2026-10-10");
    expect(formatTime(morningUtc)).toBe("09:30");
    expect(getPeriod(morningUtc)).toBe("Manhã");
    expect(formatLongDate(morningUtc)).toBe("10 de outubro de 2026");

    const afternoonUtc = "2026-10-10T17:00:00.000Z";
    expect(formatTime(afternoonUtc)).toBe("14:00");
    expect(getPeriod(afternoonUtc)).toBe("Tarde");
  });

  it("descreve uma data AAAA-MM-DD sem deslocar o dia", () => {
    const info = describeDate("2026-10-10");
    expect(info.day).toBe(10);
    expect(info.weekday).toBe("sáb");
    expect(info.month).toBe("out");
    expect(info.long).toBe("sábado, 10 de outubro");
  });

  it("gera proximos dias e rotulos de Hoje e Amanha", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T15:00:00.000Z"));

    expect(getUpcomingDates(3)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
    expect(describeDayHeading("2026-10-10")).toBe(
      "Hoje · sábado, 10 de outubro"
    );
    expect(describeDayHeading("2026-10-11")).toBe(
      "Amanhã · domingo, 11 de outubro"
    );
    expect(describeDayHeading("2026-10-12")).toBe(
      "segunda-feira, 12 de outubro"
    );
  });

  it("valida e aplica mascara DD/MM/AAAA", () => {
    expect(maskDate("10101990")).toBe("10/10/1990");
    expect(isValidDate("10/10/1990")).toBe(true);
    expect(isValidDate("30/02/1990")).toBe(false);
    expect(isValidDate("10/10/2099")).toBe(false);
  });
});

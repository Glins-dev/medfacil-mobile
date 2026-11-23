import { describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => {
  const storage = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  };
});

import {
  createHospitalSchema,
  createScheduleSlotSchema,
} from "@/schemas/admin.schema";
import { useAdminStore } from "@/stores/admin.store";
import type { AdminDoctor, Hospital } from "@/types/admin";
import {
  filterCompatibleDoctorsForHospital,
  hasDuplicateScheduleSlot,
  isDoctorCompatibleWithHospital,
} from "@/utils/adminRules";
import { getUpcomingDates } from "@/utils/date";

function toBrDate(isoKey: string): string {
  const [yyyy, mm, dd] = isoKey.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

describe("createHospitalSchema", () => {
  it("aceita dados validos com ao menos uma especialidade", () => {
    const parsed = createHospitalSchema.safeParse({
      name: "Hospital Santa Clara",
      address: "Av. Agamenon Magalhães, 1200",
      specialtyIds: ["spec-cardio"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita nome curto, endereco curto ou nenhuma especialidade marcada", () => {
    const missingSpecs = createHospitalSchema.safeParse({
      name: "Hospital Central",
      address: "Rua do Sol, 100",
      specialtyIds: [],
    });
    expect(missingSpecs.success).toBe(false);
    if (!missingSpecs.success) {
      expect(missingSpecs.error.issues[0]?.path).toEqual(["specialtyIds"]);
    }

    const shortName = createHospitalSchema.safeParse({
      name: "HP",
      address: "Rua do Sol, 100",
      specialtyIds: ["spec-1"],
    });
    expect(shortName.success).toBe(false);
  });
});

describe("createScheduleSlotSchema", () => {
  const futureBrDate = toBrDate(getUpcomingDates(3)[2] ?? "2099-12-01");

  it("aceita medico, data futura em DD/MM/AAAA e horario HH:mm", () => {
    const parsed = createScheduleSlotSchema.safeParse({
      doctorId: "doc-1",
      date: futureBrDate,
      time: "14:30",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita data no passado, horario invalido ou medico ausente", () => {
    const pastDate = createScheduleSlotSchema.safeParse({
      doctorId: "doc-1",
      date: "01/01/2020",
      time: "09:00",
    });
    expect(pastDate.success).toBe(false);

    const invalidTime = createScheduleSlotSchema.safeParse({
      doctorId: "doc-1",
      date: futureBrDate,
      time: "25:99",
    });
    expect(invalidTime.success).toBe(false);

    const missingDoctor = createScheduleSlotSchema.safeParse({
      doctorId: "",
      date: futureBrDate,
      time: "09:00",
    });
    expect(missingDoctor.success).toBe(false);
  });
});

describe("compatibilidade de medico com especialidades do hospital", () => {
  const doctors: AdminDoctor[] = [
    {
      id: "doc-cardio",
      name: "Dra. Ana",
      crm: "12345/PE",
      specialtyIds: ["spec-cardio"],
      specialtyNames: ["Cardiologia"],
      source: "api",
    },
    {
      id: "doc-dermato",
      name: "Dr. Bruno",
      crm: "54321/PE",
      specialtyIds: ["spec-dermato"],
      specialtyNames: ["Dermatologia"],
      source: "api",
    },
    {
      id: "doc-pediatra",
      name: "Dra. Carla",
      crm: "67890/PE",
      specialtyIds: ["spec-pediatria", "spec-cardio"],
      specialtyNames: ["Pediatria", "Cardiologia"],
      source: "local",
    },
  ];

  const cardioHospital: Hospital = {
    id: "hosp-1",
    name: "Hospital do Coração",
    address: "Rua Nova, 50",
    specialtyIds: ["spec-cardio"],
    doctorIds: ["doc-cardio"],
  };

  it("filtra apenas medicos com especialidade presente no hospital e separa vinculados vs disponiveis", () => {
    expect(isDoctorCompatibleWithHospital(doctors[0], cardioHospital)).toBe(true);
    expect(isDoctorCompatibleWithHospital(doctors[1], cardioHospital)).toBe(false);

    const result = filterCompatibleDoctorsForHospital(doctors, cardioHospital);
    expect(result.compatible.map((d) => d.id)).toEqual([
      "doc-cardio",
      "doc-pediatra",
    ]);
    expect(result.linked.map((d) => d.id)).toEqual(["doc-cardio"]);
    expect(result.availableToLink.map((d) => d.id)).toEqual(["doc-pediatra"]);
  });

  it("retorna listas vazias quando nenhuma especialidade coincide", () => {
    const ortopediaHospital: Hospital = {
      id: "hosp-2",
      name: "Hospital Ortopédico",
      address: "Av. Norte, 300",
      specialtyIds: ["spec-ortopedia"],
      doctorIds: [],
    };
    const result = filterCompatibleDoctorsForHospital(
      doctors,
      ortopediaHospital
    );
    expect(result.compatible).toHaveLength(0);
    expect(result.availableToLink).toHaveLength(0);
  });
});

describe("useAdminStore cascata e duplicidade", () => {
  it("impede vinculo incompativel e remove vinculos e horarios ao excluir medico", () => {
    const store = useAdminStore.getState();
    store.resetLocalAdminData();

    store.upsertDoctor({
      id: "doc-1",
      name: "Dr. João",
      crm: "11111/PE",
      specialtyIds: ["spec-cardio"],
      specialtyNames: ["Cardiologia"],
      source: "api",
    });
    store.upsertDoctor({
      id: "doc-2",
      name: "Dra. Maria",
      crm: "22222/PE",
      specialtyIds: ["spec-dermato"],
      specialtyNames: ["Dermatologia"],
      source: "api",
    });

    store.addHospital({
      id: "hosp-1",
      name: "Hospital Vida",
      address: "Rua A, 10",
      specialtyIds: ["spec-cardio"],
      doctorIds: [],
    });

    store.linkDoctorToHospital("hosp-1", "doc-1");
    store.linkDoctorToHospital("hosp-1", "doc-2");

    expect(useAdminStore.getState().hospitals[0]?.doctorIds).toEqual(["doc-1"]);

    store.addScheduleSlot({
      id: "slot-1",
      doctorId: "doc-1",
      hospitalId: "hosp-1",
      date: "2026-12-10",
      time: "09:00",
    });
    expect(
      hasDuplicateScheduleSlot(useAdminStore.getState().scheduleSlots, {
        doctorId: "doc-1",
        date: "2026-12-10",
        time: "09:00",
      })
    ).toBe(true);

    store.removeDoctor("doc-1");

    const updated = useAdminStore.getState();
    expect(updated.doctors.map((d) => d.id)).toEqual(["doc-2"]);
    expect(updated.deletedDoctorIds).toContain("doc-1");
    expect(updated.hospitals[0]?.doctorIds).toEqual([]);
    expect(updated.scheduleSlots).toHaveLength(0);

    store.resetLocalAdminData();
  });
});

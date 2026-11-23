import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { api } from "@/services/api";
import {
  appointmentService,
  buildBookRequestPayload,
  classifyBookingError,
  clinicSlotToIso,
} from "@/services/appointment.service";
import { catalogService } from "@/services/catalog.service";
import { doctorService } from "@/services/doctor.service";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import { getUpcomingDates } from "@/utils/date";

function makeAxiosError(status: number | undefined, message?: string): AxiosError {
  if (status === undefined) {
    return new AxiosError("Network Error", "ERR_NETWORK");
  }
  return new AxiosError(
    message ?? "Request failed",
    "ERR_BAD_REQUEST",
    { headers: {} } as InternalAxiosRequestConfig,
    undefined,
    {
      status,
      statusText: String(status),
      headers: {},
      config: { headers: {} } as InternalAxiosRequestConfig,
      data: message ? { message } : {},
    }
  );
}

describe("fluxo de confirmacao de agendamento", () => {
  const futureDate = getUpcomingDates(4)[3] ?? "2099-12-10";

  beforeEach(() => {
    vi.restoreAllMocks();
    useAdminStore.getState().resetLocalAdminData();
    useAuthStore.getState().setSession("token-paciente", {
      id: "patient-1",
      name: "Maria Silva",
      email: "maria@medfacil.com",
      role: "PACIENTE",
    });
  });

  it("monta apenas { doctorId, date, time } no payload HTTP de agendamento", () => {
    const requestPayload = buildBookRequestPayload({
      doctorId: " doc-1 ",
      date: ` ${futureDate} `,
      time: " 14:00 ",
      specialty: "Cardiologia",
      doctorName: "Dra. Ana",
      hospitalId: "hosp-1",
      hospitalName: "Hospital Esperança",
      hospitalAddress: "Rua Antônio Gomes de Freitas, 265",
    });

    expect(requestPayload).toEqual({
      doctorId: "doc-1",
      date: futureDate,
      time: "14:00",
    });
  });

  it("conclui agendamento de horario adicionado pelo Admin quando o backend retorna 409 e sincroniza paciente e medico", async () => {
    const admin = useAdminStore.getState();
    admin.upsertDoctor({
      id: "doc-1",
      name: "Dra. Ana Paula",
      crm: "12345/PE",
      specialtyIds: ["spec-cardio"],
      specialtyNames: ["Cardiologia"],
      source: "api",
    });
    admin.addHospital({
      id: "hosp-esperanca",
      name: "Hospital Esperança",
      address: "Rua Antônio Gomes de Freitas, 265",
      specialtyIds: ["spec-cardio"],
      doctorIds: ["doc-1"],
    });
    admin.addScheduleSlot({
      id: "slot-1",
      doctorId: "doc-1",
      hospitalId: "hosp-esperanca",
      date: futureDate,
      time: "14:00",
    });

    vi.spyOn(api, "post").mockRejectedValueOnce(
      makeAxiosError(409, "Este horário não está mais disponível.")
    );
    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/appointments") {
        return { data: { appointments: [] } };
      }
      if (url === "/doctor/appointments") {
        return { data: { appointments: [] } };
      }
      if (url.startsWith("/catalog/doctors/")) {
        return { data: { slots: [] } };
      }
      return { data: {} };
    });

    const created = await appointmentService.book({
      doctorId: "doc-1",
      date: futureDate,
      time: "14:00",
      specialty: "Cardiologia",
      doctorName: "Dra. Ana Paula",
      doctorCrm: "12345/PE",
      hospitalId: "hosp-esperanca",
      hospitalName: "Hospital Esperança",
      hospitalAddress: "Rua Antônio Gomes de Freitas, 265",
    });

    expect(created.doctorId).toBe("doc-1");
    expect(created.specialty).toBe("Cardiologia");
    expect(created.dateTime).toBe(clinicSlotToIso(futureDate, "14:00"));
    expect(created.hospitalName).toBe("Hospital Esperança");
    expect(created.hospitalAddress).toBe("Rua Antônio Gomes de Freitas, 265");

    const remainingSlots = await catalogService.listSlots("doc-1", futureDate);
    expect(remainingSlots).not.toContain("14:00");

    const patientAppointments = await appointmentService.list();
    expect(patientAppointments).toHaveLength(1);
    expect(patientAppointments[0]?.id).toBe(created.id);
    expect(patientAppointments[0]?.hospitalName).toBe("Hospital Esperança");
    expect(patientAppointments[0]?.hospitalAddress).toBe(
      "Rua Antônio Gomes de Freitas, 265"
    );

    useAuthStore.getState().setSession("token-medico", {
      id: "doc-1",
      name: "Dra. Ana Paula",
      email: "ana@medfacil.com",
      role: "MEDICO",
      crm: "12345/PE",
    });
    const doctorUpcoming = await doctorService.listUpcoming(5);
    expect(doctorUpcoming).toHaveLength(1);
    expect(doctorUpcoming[0]?.id).toBe(created.id);
    expect(doctorUpcoming[0]?.patientName).toBe("Maria Silva");
    expect(doctorUpcoming[0]?.reason).toBe("Cardiologia");

    useAuthStore.getState().setSession("token-outro-paciente", {
      id: "patient-2",
      name: "Carlos Lima",
      email: "carlos@medfacil.com",
      role: "PACIENTE",
    });
    await expect(
      appointmentService.book({
        doctorId: "doc-1",
        date: futureDate,
        time: "14:00",
      })
    ).rejects.toThrow("Este horário não está mais disponível.");
  });

  it("propaga conflito real 409 quando o paciente ja possui consulta no mesmo horario", async () => {
    const admin = useAdminStore.getState();
    admin.addScheduleSlot({
      id: "slot-dup",
      doctorId: "doc-1",
      hospitalId: null,
      date: futureDate,
      time: "15:00",
    });

    vi.spyOn(api, "post").mockRejectedValueOnce(
      makeAxiosError(409, "Você já possui uma consulta neste horário.")
    );

    let caught: unknown;
    try {
      await appointmentService.book({
        doctorId: "doc-1",
        date: futureDate,
        time: "15:00",
      });
    } catch (error) {
      caught = error;
    }

    const classified = classifyBookingError(caught);
    expect(classified).toEqual({
      status: 409,
      isConflict: true,
      message: "Você já possui uma consulta neste horário.",
    });
    expect(useAdminStore.getState().localAppointments).toHaveLength(0);
  });

  it("preserva metadata de hospital quando a API confirma o agendamento normalmente", async () => {
    const slotIso = clinicSlotToIso(futureDate, "09:30");
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        appointment: {
          id: "api-appt-1",
          dateTime: slotIso,
          status: "AGENDADO",
          doctorId: "doc-api",
          doctorName: "Dr. Pedro",
          specialty: "Dermatologia",
        },
      },
    });
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        appointments: [
          {
            id: "api-appt-1",
            dateTime: slotIso,
            status: "AGENDADO",
            doctorId: "doc-api",
            doctorName: "Dr. Pedro",
            specialty: "Dermatologia",
          },
        ],
      },
    });

    const created = await appointmentService.book({
      doctorId: "doc-api",
      date: futureDate,
      time: "09:30",
      hospitalId: "hosp-2",
      hospitalName: "Hospital Memorial São José",
      hospitalAddress: "Av. Agamenon Magalhães, 2291",
    });

    expect(created.hospitalName).toBe("Hospital Memorial São José");
    expect(created.hospitalAddress).toBe("Av. Agamenon Magalhães, 2291");

    const listed = await appointmentService.list();
    expect(listed[0]?.hospitalName).toBe("Hospital Memorial São José");
    expect(listed[0]?.hospitalAddress).toBe("Av. Agamenon Magalhães, 2291");
  });

  it("classifica erros 500 e de rede sem ativar falso conflito de horario", () => {
    const serverError = classifyBookingError(
      makeAxiosError(500, "Erro interno no servidor.")
    );
    expect(serverError).toEqual({
      status: 500,
      isConflict: false,
      message: "Erro interno no servidor.",
    });

    const networkError = classifyBookingError(makeAxiosError(undefined));
    expect(networkError).toEqual({
      status: undefined,
      isConflict: false,
      message: "Sem conexão com o servidor.",
    });

    const realConflict = classifyBookingError(
      makeAxiosError(409, "Este horário não está mais disponível.")
    );
    expect(realConflict).toEqual({
      status: 409,
      isConflict: true,
      message: "Este horário não está mais disponível.",
    });
  });

  it("cancela consulta persistida localmente sem falhar chamada remota", async () => {
    const admin = useAdminStore.getState();
    admin.addScheduleSlot({
      id: "slot-cancel",
      doctorId: "doc-1",
      date: futureDate,
      time: "16:00",
    });

    vi.spyOn(api, "post").mockRejectedValueOnce(
      makeAxiosError(409, "Este horário não está mais disponível.")
    );
    const patchSpy = vi.spyOn(api, "patch");

    const created = await appointmentService.book({
      doctorId: "doc-1",
      date: futureDate,
      time: "16:00",
      doctorName: "Dra. Ana Paula",
      specialty: "Cardiologia",
    });

    await appointmentService.cancel(created.id);

    expect(patchSpy).not.toHaveBeenCalled();
    expect(useAdminStore.getState().localAppointments[0]?.status).toBe(
      "CANCELADO"
    );
  });
});

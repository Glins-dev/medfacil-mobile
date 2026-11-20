import { api } from "@/services/api";

export interface Specialty {
  id: string;
  name: string;
  description: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  crm: string;
}

export interface AvailableDateSlots {
  date: string;
  slots: string[];
}

export interface DoctorWithAvailability extends Doctor {
  availableDates: AvailableDateSlots[];
  totalSlots: number;
}

interface RawSpecialty {
  id: string;
  nome: string;
  descricao: string | null;
}

export const catalogService = {
  listSpecialties: async (): Promise<Specialty[]> => {
    const { data } = await api.get<{ specialties: RawSpecialty[] }>(
      "/catalog/specialties"
    );

    return data.specialties.map((s) => ({
      id: s.id,
      name: s.nome,
      description: s.descricao,
    }));
  },

  listDoctors: async (specialtyId: string): Promise<Doctor[]> => {
    const { data } = await api.get<{ doctors: Doctor[] }>(
      `/catalog/specialties/${specialtyId}/doctors`
    );
    return data.doctors;
  },

  // Horarios livres ("HH:mm", no horario da clinica) de um medico em uma data.
  listSlots: async (doctorId: string, date: string): Promise<string[]> => {
    const { data } = await api.get<{ slots: string[] }>(
      `/catalog/doctors/${doctorId}/slots`,
      { params: { date } }
    );
    return data.slots;
  },

  // Retorna apenas as datas que possuem ao menos um horario livre, ordenadas.
  listAvailableDates: async (
    doctorId: string,
    dates: string[]
  ): Promise<AvailableDateSlots[]> => {
    if (dates.length === 0) return [];

    const results = await Promise.allSettled(
      dates.map(async (date) => ({
        date,
        slots: await catalogService.listSlots(doctorId, date),
      }))
    );

    const fulfilled: AvailableDateSlots[] = [];
    let firstError: unknown = null;

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.slots.length > 0) {
          fulfilled.push(result.value);
        }
      } else if (!firstError) {
        firstError = result.reason;
      }
    }

    if (fulfilled.length === 0 && results.every((r) => r.status === "rejected")) {
      throw firstError;
    }

    return fulfilled.sort((a, b) => a.date.localeCompare(b.date));
  },

  // Filtra apenas medicos que possuem pelo menos um horario livre nas datas informadas.
  listAvailableDoctors: async (
    specialtyId: string,
    dates: string[]
  ): Promise<DoctorWithAvailability[]> => {
    const doctors = await catalogService.listDoctors(specialtyId);
    if (doctors.length === 0) return [];

    const availability = await Promise.all(
      doctors.map(async (doctor) => {
        const availableDates = await catalogService.listAvailableDates(
          doctor.id,
          dates
        );
        const totalSlots = availableDates.reduce(
          (sum, item) => sum + item.slots.length,
          0
        );
        return {
          ...doctor,
          availableDates,
          totalSlots,
        };
      })
    );

    return availability.filter((doctor) => doctor.availableDates.length > 0);
  },
};

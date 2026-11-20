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

  // Horários livres ("HH:mm", no horário da clínica) de um médico em uma data.
  listSlots: async (doctorId: string, date: string): Promise<string[]> => {
    const { data } = await api.get<{ slots: string[] }>(
      `/catalog/doctors/${doctorId}/slots`,
      { params: { date } }
    );
    return data.slots;
  },
};

import { api } from "@/services/api";

export interface AdminSpecialty {
  id: string;
  name: string;
  description: string | null;
}

export interface CreatedDoctor {
  id: string;
  name: string;
  email: string;
  crm: string;
  specialties: string[];
}

export interface CreateSpecialtyPayload {
  name: string;
  description?: string;
}

export interface CreateDoctorPayload {
  name: string;
  email: string;
  cpf: string; // só dígitos
  phone: string; // só dígitos
  crm: string; // 12345/PE
  password: string;
  specialtyIds: string[];
}

export const adminService = {
  // Todas as especialidades (inclusive as sem médico), para o formulário.
  listSpecialties: async (): Promise<AdminSpecialty[]> => {
    const { data } = await api.get<{ specialties: AdminSpecialty[] }>(
      "/admin/specialties"
    );
    return data.specialties;
  },

  createSpecialty: async (
    payload: CreateSpecialtyPayload
  ): Promise<AdminSpecialty> => {
    const { data } = await api.post<{ specialty: AdminSpecialty }>(
      "/admin/specialties",
      payload
    );
    return data.specialty;
  },

  createDoctor: async (
    payload: CreateDoctorPayload
  ): Promise<CreatedDoctor> => {
    const { data } = await api.post<{ doctor: CreatedDoctor }>(
      "/admin/doctors",
      payload
    );
    return data.doctor;
  },
};

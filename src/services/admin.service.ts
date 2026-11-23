import { api } from "@/services/api";
import { useAdminStore } from "@/stores/admin.store";
import type {
  AdminDoctor,
  AdminSpecialtyItem,
  Hospital,
  ScheduleSlot,
} from "@/types/admin";
import {
  hasDuplicateScheduleSlot,
  isDoctorCompatibleWithHospital,
} from "@/utils/adminRules";
import {
  normalizeSpecialty,
  sanitizeHospitalSpecialtyIds,
  type RawSpecialtyRecord,
} from "@/utils/specialties";

export type AdminSpecialty = AdminSpecialtyItem;

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
  cpf: string; // so digitos
  phone: string; // so digitos
  crm: string; // 12345/PE
  password: string;
  specialtyIds: string[];
}

export interface CreateHospitalPayload {
  name: string;
  address: string;
  specialtyIds: string[];
}

export interface CreateScheduleSlotPayload {
  doctorId: string;
  hospitalId?: string | null;
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
}

interface CatalogDoctorDto {
  id: string;
  name: string;
  crm: string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const adminService = {
  // Todas as especialidades (inclusive as sem medico), normalizadas e sincronizadas na store.
  listSpecialties: async (): Promise<AdminSpecialty[]> => {
    const { data } = await api.get<{ specialties: RawSpecialtyRecord[] }>(
      "/admin/specialties"
    );

    const normalized = data.specialties
      .map(normalizeSpecialty)
      .filter((item): item is AdminSpecialty => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    useAdminStore.getState().syncSpecialties(normalized);
    return normalized;
  },

  createSpecialty: async (
    payload: CreateSpecialtyPayload
  ): Promise<AdminSpecialty> => {
    const { data } = await api.post<{ specialty: RawSpecialtyRecord }>(
      "/admin/specialties",
      payload
    );

    const normalized = normalizeSpecialty(data.specialty) ?? {
      id: String(data.specialty.id ?? data.specialty._id ?? generateId("spec")),
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
    };

    useAdminStore.getState().upsertSpecialty(normalized);
    return normalized;
  },

  createDoctor: async (
    payload: CreateDoctorPayload
  ): Promise<CreatedDoctor> => {
    const { data } = await api.post<{ doctor: CreatedDoctor }>(
      "/admin/doctors",
      payload
    );
    const created = data.doctor;

    useAdminStore.getState().upsertDoctor({
      id: created.id,
      name: created.name,
      email: created.email,
      crm: created.crm,
      specialtyIds: payload.specialtyIds,
      specialtyNames: created.specialties,
      source: "api",
    });

    return created;
  },

  // Consulta medicos por especialidade no catalogo da API e combina com o estado local persistido.
  listDoctors: async (
    specialtiesList?: AdminSpecialty[]
  ): Promise<AdminDoctor[]> => {
    const store = useAdminStore.getState();

    try {
      const specialties = specialtiesList ?? (await adminService.listSpecialties());
      const results = await Promise.allSettled(
        specialties.map(async (spec) => {
          const { data } = await api.get<{ doctors: CatalogDoctorDto[] }>(
            `/catalog/specialties/${spec.id}/doctors`
          );
          return { spec, doctors: data.doctors };
        })
      );

      const discovered = new Map<string, AdminDoctor>();
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { spec, doctors } = result.value;
        for (const doc of doctors) {
          const current = discovered.get(doc.id);
          if (current) {
            if (!current.specialtyIds.includes(spec.id)) {
              current.specialtyIds.push(spec.id);
              current.specialtyNames.push(spec.name);
            }
          } else {
            discovered.set(doc.id, {
              id: doc.id,
              name: doc.name,
              crm: doc.crm,
              specialtyIds: [spec.id],
              specialtyNames: [spec.name],
              source: "api",
            });
          }
        }
      }

      store.syncApiDoctors([...discovered.values()]);
    } catch {
      // Caso a consulta ao catalogo falhe, preserva os medicos ja armazenados localmente.
    }

    return useAdminStore.getState().doctors;
  },

  deleteDoctor: async (doctorId: string): Promise<void> => {
    useAdminStore.getState().removeDoctor(doctorId);
  },

  listHospitals: async (): Promise<Hospital[]> => {
    return useAdminStore.getState().hospitals;
  },

  createHospital: async (payload: CreateHospitalPayload): Promise<Hospital> => {
    const store = useAdminStore.getState();
    const cleanedIds = sanitizeHospitalSpecialtyIds(
      payload.specialtyIds,
      store.specialties
    );

    const specialtyNamesById: Record<string, string> = {};
    for (const id of cleanedIds) {
      const match = store.specialties.find(
        (spec) => spec.id.toLowerCase() === id.toLowerCase()
      );
      if (match) {
        specialtyNamesById[id] = match.name;
      }
    }

    const hospital: Hospital = {
      id: generateId("hosp"),
      name: payload.name.trim(),
      address: payload.address.trim(),
      specialtyIds: cleanedIds,
      specialtyNamesById,
      doctorIds: [],
    };
    store.addHospital(hospital);
    return hospital;
  },

  linkDoctorToHospital: async (
    hospitalId: string,
    doctorId: string
  ): Promise<Hospital> => {
    const state = useAdminStore.getState();
    const hospital = state.hospitals.find((item) => item.id === hospitalId);
    if (!hospital) {
      throw new Error("Hospital não encontrado.");
    }

    const doctor = state.doctors.find((item) => item.id === doctorId);
    if (!doctor) {
      throw new Error("Médico não encontrado.");
    }

    if (!isDoctorCompatibleWithHospital(doctor, hospital)) {
      throw new Error(
        "A especialidade deste médico não é atendida por este hospital."
      );
    }

    state.linkDoctorToHospital(hospitalId, doctorId);
    return (
      useAdminStore
        .getState()
        .hospitals.find((item) => item.id === hospitalId) ?? hospital
    );
  },

  unlinkDoctorFromHospital: async (
    hospitalId: string,
    doctorId: string
  ): Promise<Hospital> => {
    const state = useAdminStore.getState();
    state.unlinkDoctorFromHospital(hospitalId, doctorId);
    const updated = useAdminStore
      .getState()
      .hospitals.find((item) => item.id === hospitalId);
    if (!updated) {
      throw new Error("Hospital não encontrado.");
    }
    return updated;
  },

  listScheduleSlots: async (): Promise<ScheduleSlot[]> => {
    return useAdminStore.getState().scheduleSlots;
  },

  createScheduleSlot: async (
    payload: CreateScheduleSlotPayload
  ): Promise<ScheduleSlot> => {
    const state = useAdminStore.getState();
    if (hasDuplicateScheduleSlot(state.scheduleSlots, payload)) {
      throw new Error("Este médico já possui esse horário cadastrado.");
    }

    const slot: ScheduleSlot = {
      id: generateId("slot"),
      doctorId: payload.doctorId,
      hospitalId: payload.hospitalId ?? null,
      date: payload.date,
      time: payload.time,
    };

    state.addScheduleSlot(slot);
    return slot;
  },

  deleteScheduleSlot: async (slotId: string): Promise<void> => {
    useAdminStore.getState().removeScheduleSlot(slotId);
  },
};

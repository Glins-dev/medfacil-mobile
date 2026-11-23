import {
  findMatchingHealthProfile,
  useHealthProfileStore,
} from "@/stores/healthProfile.store";
import type {
  PatientHealthProfile,
  SaveHealthProfileInput,
} from "@/types/healthProfile";

// Camada assincrona de pre-prontuario pronta para futura integracao REST sem alterar telas ou testes.
export const healthProfileService = {
  getByPatient: async (lookup: {
    patientId?: string | null;
    patientName?: string | null;
  }): Promise<PatientHealthProfile | null> => {
    const profiles = useHealthProfileStore.getState().profiles;
    return findMatchingHealthProfile(profiles, lookup);
  },

  save: async (
    input: SaveHealthProfileInput
  ): Promise<PatientHealthProfile> => {
    const cleanPatientName = input.patientName?.trim();
    const saved: PatientHealthProfile = {
      patientId: input.patientId.trim(),
      ...(cleanPatientName ? { patientName: cleanPatientName } : {}),
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      bloodType: input.bloodType,
      comorbidities: [...new Set(input.comorbidities)],
      specialConditions: input.specialConditions.trim(),
      allergies: [...new Set(input.allergies)],
      otherAllergies: input.otherAllergies.trim(),
      updatedAt: new Date().toISOString(),
    };

    useHealthProfileStore.getState().upsertProfile(saved);
    return saved;
  },
};

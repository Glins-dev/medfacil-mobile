import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type { PatientHealthProfile } from "@/types/healthProfile";

const HEALTH_PROFILE_STORAGE_KEY = "medfacil_health_profiles";

export function normalizeHealthPatientName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Localiza o pre-prontuario por patientId exato ou fallback por nome normalizado.
export function findMatchingHealthProfile(
  profiles: PatientHealthProfile[],
  lookup: { patientId?: string | null; patientName?: string | null }
): PatientHealthProfile | null {
  const cleanId = lookup.patientId?.trim();
  if (cleanId) {
    const byId = profiles.find((item) => item.patientId === cleanId);
    if (byId) return byId;
  }

  const cleanName = lookup.patientName?.trim();
  if (cleanName) {
    const targetName = normalizeHealthPatientName(cleanName);
    const byName = profiles.find(
      (item) =>
        item.patientName &&
        normalizeHealthPatientName(item.patientName) === targetName
    );
    if (byName) return byName;
  }

  return null;
}

function sortUpdatedNewestFirst(
  list: PatientHealthProfile[]
): PatientHealthProfile[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const secureStoreAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // Ignora indisponibilidade de storage fora do ambiente nativo.
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // Ignora indisponibilidade de storage fora do ambiente nativo.
    }
  },
};

export interface HealthProfileState {
  profiles: PatientHealthProfile[];
  _hasHydrated: boolean;
  upsertProfile: (profile: PatientHealthProfile) => void;
  clearProfiles: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useHealthProfileStore = create<HealthProfileState>()(
  persist(
    (set) => ({
      profiles: [],
      _hasHydrated: false,
      upsertProfile: (profile) =>
        set((state) => ({
          profiles: sortUpdatedNewestFirst([
            profile,
            ...state.profiles.filter(
              (item) => item.patientId !== profile.patientId
            ),
          ]),
        })),
      clearProfiles: () => set({ profiles: [] }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: HEALTH_PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        profiles: state.profiles,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          useHealthProfileStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

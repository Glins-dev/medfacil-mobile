import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type { Prescription } from "@/types/prescription";

const PRESCRIPTIONS_STORAGE_KEY = "medfacil_prescriptions";
const NAME_PREFIX = "name:";

function normalizePersonName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Gera identificador deterministico quando a lista do medico nao retorna patientId explicito.
export function buildFallbackPatientId(patientName: string): string {
  return `${NAME_PREFIX}${normalizePersonName(patientName)}`;
}

// Verifica se uma receita pertence ao paciente autenticado por id ou nome normalizado de fallback.
export function matchesPatientPrescription(
  prescription: Prescription,
  patient: { id: string; name?: string | null }
): boolean {
  if (prescription.patientId === patient.id) {
    return true;
  }
  if (
    prescription.patientId.startsWith(NAME_PREFIX) &&
    patient.name?.trim()
  ) {
    const targetName = prescription.patientId.slice(NAME_PREFIX.length);
    return normalizePersonName(patient.name) === targetName;
  }
  return false;
}

function sortNewestFirst(list: Prescription[]): Prescription[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export interface PrescriptionState {
  prescriptions: Prescription[];
  _hasHydrated: boolean;
  addPrescription: (prescription: Prescription) => void;
  setPrescriptions: (list: Prescription[]) => void;
  clearPrescriptions: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const usePrescriptionStore = create<PrescriptionState>()(
  persist(
    (set) => ({
      prescriptions: [],
      _hasHydrated: false,
      addPrescription: (prescription) =>
        set((state) => ({
          prescriptions: sortNewestFirst([
            prescription,
            ...state.prescriptions.filter((item) => item.id !== prescription.id),
          ]),
        })),
      setPrescriptions: (list) =>
        set({ prescriptions: sortNewestFirst(list) }),
      clearPrescriptions: () => set({ prescriptions: [] }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: PRESCRIPTIONS_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        prescriptions: state.prescriptions,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          usePrescriptionStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type {
  AdminDoctor,
  Hospital,
  RemovedScheduleSlot,
  ScheduleSlot,
} from "@/types/admin";
import {
  hasDuplicateScheduleSlot,
  isDoctorCompatibleWithHospital,
} from "@/utils/adminRules";

const ADMIN_STORAGE_KEY = "medfacil_admin_management";

const byDoctorName = (a: AdminDoctor, b: AdminDoctor) =>
  a.name.localeCompare(b.name, "pt-BR");

const byHospitalName = (a: Hospital, b: Hospital) =>
  a.name.localeCompare(b.name, "pt-BR");

const bySlotChronological = (a: ScheduleSlot, b: ScheduleSlot) => {
  const dateDiff = a.date.localeCompare(b.date);
  return dateDiff !== 0 ? dateDiff : a.time.localeCompare(b.time);
};

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

export interface AdminManagementState {
  doctors: AdminDoctor[];
  deletedDoctorIds: string[];
  hospitals: Hospital[];
  scheduleSlots: ScheduleSlot[];
  removedSlots: RemovedScheduleSlot[];
  _hasHydrated: boolean;
  upsertDoctor: (doctor: AdminDoctor) => void;
  syncApiDoctors: (apiDoctors: AdminDoctor[]) => void;
  removeDoctor: (doctorId: string) => void;
  addHospital: (hospital: Hospital) => void;
  removeHospital: (hospitalId: string) => void;
  linkDoctorToHospital: (hospitalId: string, doctorId: string) => void;
  unlinkDoctorFromHospital: (hospitalId: string, doctorId: string) => void;
  addScheduleSlot: (slot: ScheduleSlot) => void;
  removeScheduleSlot: (slotId: string) => void;
  resetLocalAdminData: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAdminStore = create<AdminManagementState>()(
  persist(
    (set) => ({
      doctors: [],
      deletedDoctorIds: [],
      hospitals: [],
      scheduleSlots: [],
      removedSlots: [],
      _hasHydrated: false,

      upsertDoctor: (doctor) =>
        set((state) => ({
          deletedDoctorIds: state.deletedDoctorIds.filter(
            (id) => id !== doctor.id
          ),
          doctors: [
            ...state.doctors.filter((item) => item.id !== doctor.id),
            doctor,
          ].sort(byDoctorName),
        })),

      syncApiDoctors: (apiDoctors) =>
        set((state) => {
          const deletedSet = new Set(state.deletedDoctorIds);
          const merged = new Map<string, AdminDoctor>();

          for (const existing of state.doctors) {
            if (!deletedSet.has(existing.id)) {
              merged.set(existing.id, existing);
            }
          }

          for (const remote of apiDoctors) {
            if (deletedSet.has(remote.id)) continue;
            const prev = merged.get(remote.id);
            const specialtyIds = [
              ...new Set([
                ...(prev?.specialtyIds ?? []),
                ...remote.specialtyIds,
              ]),
            ];
            const specialtyNames = [
              ...new Set([
                ...(prev?.specialtyNames ?? []),
                ...remote.specialtyNames,
              ]),
            ];

            merged.set(remote.id, {
              ...prev,
              ...remote,
              email: remote.email ?? prev?.email ?? null,
              specialtyIds,
              specialtyNames,
            });
          }

          return {
            doctors: [...merged.values()].sort(byDoctorName),
          };
        }),

      removeDoctor: (doctorId) =>
        set((state) => ({
          doctors: state.doctors.filter((item) => item.id !== doctorId),
          deletedDoctorIds: state.deletedDoctorIds.includes(doctorId)
            ? state.deletedDoctorIds
            : [...state.deletedDoctorIds, doctorId],
          hospitals: state.hospitals.map((hospital) => ({
            ...hospital,
            doctorIds: hospital.doctorIds.filter((id) => id !== doctorId),
          })),
          scheduleSlots: state.scheduleSlots.filter(
            (slot) => slot.doctorId !== doctorId
          ),
          removedSlots: state.removedSlots.filter(
            (slot) => slot.doctorId !== doctorId
          ),
        })),

      addHospital: (hospital) =>
        set((state) => ({
          hospitals: [
            ...state.hospitals.filter((item) => item.id !== hospital.id),
            hospital,
          ].sort(byHospitalName),
        })),

      removeHospital: (hospitalId) =>
        set((state) => ({
          hospitals: state.hospitals.filter((item) => item.id !== hospitalId),
          scheduleSlots: state.scheduleSlots.map((slot) =>
            slot.hospitalId === hospitalId ? { ...slot, hospitalId: null } : slot
          ),
        })),

      linkDoctorToHospital: (hospitalId, doctorId) =>
        set((state) => {
          const hospital = state.hospitals.find((item) => item.id === hospitalId);
          if (!hospital) return state;

          const doctor = state.doctors.find((item) => item.id === doctorId);
          if (doctor && !isDoctorCompatibleWithHospital(doctor, hospital)) {
            return state;
          }

          if (hospital.doctorIds.includes(doctorId)) {
            return state;
          }

          return {
            hospitals: state.hospitals.map((item) =>
              item.id === hospitalId
                ? { ...item, doctorIds: [...item.doctorIds, doctorId] }
                : item
            ),
          };
        }),

      unlinkDoctorFromHospital: (hospitalId, doctorId) =>
        set((state) => ({
          hospitals: state.hospitals.map((item) =>
            item.id === hospitalId
              ? {
                  ...item,
                  doctorIds: item.doctorIds.filter((id) => id !== doctorId),
                }
              : item
          ),
        })),

      addScheduleSlot: (slot) =>
        set((state) => {
          if (hasDuplicateScheduleSlot(state.scheduleSlots, slot)) {
            return state;
          }

          return {
            scheduleSlots: [...state.scheduleSlots, slot].sort(
              bySlotChronological
            ),
            removedSlots: state.removedSlots.filter(
              (removed) =>
                !(
                  removed.doctorId === slot.doctorId &&
                  removed.date === slot.date &&
                  removed.time === slot.time
                )
            ),
          };
        }),

      removeScheduleSlot: (slotId) =>
        set((state) => {
          const target = state.scheduleSlots.find((item) => item.id === slotId);
          if (!target) return state;

          const alreadyRecorded = hasDuplicateScheduleSlot(
            state.removedSlots,
            target
          );

          return {
            scheduleSlots: state.scheduleSlots.filter(
              (item) => item.id !== slotId
            ),
            removedSlots: alreadyRecorded
              ? state.removedSlots
              : [
                  ...state.removedSlots,
                  {
                    doctorId: target.doctorId,
                    date: target.date,
                    time: target.time,
                  },
                ],
          };
        }),

      resetLocalAdminData: () =>
        set({
          doctors: [],
          deletedDoctorIds: [],
          hospitals: [],
          scheduleSlots: [],
          removedSlots: [],
        }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: ADMIN_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        doctors: state.doctors,
        deletedDoctorIds: state.deletedDoctorIds,
        hospitals: state.hospitals,
        scheduleSlots: state.scheduleSlots,
        removedSlots: state.removedSlots,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          useAdminStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

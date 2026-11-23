import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type {
  AdminDoctor,
  AdminSpecialtyItem,
  AppointmentLocationMetadata,
  Hospital,
  LocalBookedAppointment,
  RemovedScheduleSlot,
  ScheduleSlot,
} from "@/types/admin";
import {
  hasDuplicateScheduleSlot,
  isDoctorCompatibleWithHospital,
} from "@/utils/adminRules";
import { formatTime, getClinicDateKey } from "@/utils/date";
import {
  isUuid,
  normalizeSpecialty,
  type RawSpecialtyRecord,
} from "@/utils/specialties";

const ADMIN_STORAGE_KEY = "medfacil_admin_management";

const bySpecialtyName = (a: AdminSpecialtyItem, b: AdminSpecialtyItem) =>
  a.name.localeCompare(b.name, "pt-BR");

const byDoctorName = (a: AdminDoctor, b: AdminDoctor) =>
  a.name.localeCompare(b.name, "pt-BR");

const byHospitalName = (a: Hospital, b: Hospital) =>
  a.name.localeCompare(b.name, "pt-BR");

const bySlotChronological = (a: ScheduleSlot, b: ScheduleSlot) => {
  const dateDiff = a.date.localeCompare(b.date);
  return dateDiff !== 0 ? dateDiff : a.time.localeCompare(b.time);
};

const byAppointmentChronological = (
  a: LocalBookedAppointment,
  b: LocalBookedAppointment
) => a.dateTime.localeCompare(b.dateTime);

function mergeCatalogSpecialties(
  existing: AdminSpecialtyItem[],
  incoming: Array<AdminSpecialtyItem | RawSpecialtyRecord>
): AdminSpecialtyItem[] {
  const merged = new Map<string, AdminSpecialtyItem>();

  for (const item of existing) {
    const normalized = normalizeSpecialty(item);
    if (normalized) {
      merged.set(normalized.id.toLowerCase(), normalized);
    }
  }

  for (const item of incoming) {
    const normalized = normalizeSpecialty(item);
    if (normalized) {
      merged.set(normalized.id.toLowerCase(), normalized);
    }
  }

  return [...merged.values()].sort(bySpecialtyName);
}

function buildSpecialtyNamesMap(
  specialtyIds: string[],
  catalog: AdminSpecialtyItem[],
  existingMap?: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  const catalogById = new Map(
    catalog.map((item) => [item.id.toLowerCase(), item.name])
  );

  if (existingMap) {
    for (const [id, name] of Object.entries(existingMap)) {
      const cleanId = id.trim();
      const cleanName = typeof name === "string" ? name.trim() : "";
      if (cleanId && cleanName && !isUuid(cleanName)) {
        result[cleanId] = cleanName;
      }
    }
  }

  for (const rawId of specialtyIds) {
    const cleanId = rawId.trim();
    if (!cleanId) continue;
    const match = catalogById.get(cleanId.toLowerCase());
    if (match && !isUuid(match)) {
      result[cleanId] = match;
    }
  }

  return result;
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

export interface AdminManagementState {
  specialties: AdminSpecialtyItem[];
  doctors: AdminDoctor[];
  deletedDoctorIds: string[];
  hospitals: Hospital[];
  scheduleSlots: ScheduleSlot[];
  removedSlots: RemovedScheduleSlot[];
  localAppointments: LocalBookedAppointment[];
  appointmentLocationsById: Record<string, AppointmentLocationMetadata>;
  _hasHydrated: boolean;
  syncSpecialties: (
    items: Array<AdminSpecialtyItem | RawSpecialtyRecord>
  ) => void;
  upsertSpecialty: (item: AdminSpecialtyItem | RawSpecialtyRecord) => void;
  upsertDoctor: (doctor: AdminDoctor) => void;
  syncApiDoctors: (apiDoctors: AdminDoctor[]) => void;
  removeDoctor: (doctorId: string) => void;
  addHospital: (hospital: Hospital) => void;
  removeHospital: (hospitalId: string) => void;
  linkDoctorToHospital: (hospitalId: string, doctorId: string) => void;
  unlinkDoctorFromHospital: (hospitalId: string, doctorId: string) => void;
  addScheduleSlot: (slot: ScheduleSlot) => void;
  removeScheduleSlot: (slotId: string) => void;
  addLocalAppointment: (
    appointment: LocalBookedAppointment,
    slotKey?: { doctorId: string; date: string; time: string }
  ) => void;
  consumeScheduleSlot: (doctorId: string, date: string, time: string) => void;
  cancelLocalAppointment: (appointmentId: string) => void;
  rescheduleLocalAppointment: (
    appointmentId: string,
    date: string,
    time: string
  ) => void;
  setAppointmentLocation: (
    appointmentId: string,
    location: AppointmentLocationMetadata
  ) => void;
  resetLocalAdminData: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAdminStore = create<AdminManagementState>()(
  persist(
    (set) => ({
      specialties: [],
      doctors: [],
      deletedDoctorIds: [],
      hospitals: [],
      scheduleSlots: [],
      removedSlots: [],
      localAppointments: [],
      appointmentLocationsById: {},
      _hasHydrated: false,

      syncSpecialties: (items) =>
        set((state) => {
          const nextSpecialties = mergeCatalogSpecialties(
            state.specialties,
            items
          );
          return {
            specialties: nextSpecialties,
            hospitals: state.hospitals.map((hospital) => ({
              ...hospital,
              specialtyNamesById: buildSpecialtyNamesMap(
                hospital.specialtyIds,
                nextSpecialties,
                hospital.specialtyNamesById
              ),
            })),
          };
        }),

      upsertSpecialty: (item) =>
        set((state) => {
          const nextSpecialties = mergeCatalogSpecialties(state.specialties, [
            item,
          ]);
          return {
            specialties: nextSpecialties,
            hospitals: state.hospitals.map((hospital) => ({
              ...hospital,
              specialtyNamesById: buildSpecialtyNamesMap(
                hospital.specialtyIds,
                nextSpecialties,
                hospital.specialtyNamesById
              ),
            })),
          };
        }),

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
        set((state) => {
          const enrichedHospital: Hospital = {
            ...hospital,
            specialtyNamesById: buildSpecialtyNamesMap(
              hospital.specialtyIds,
              state.specialties,
              hospital.specialtyNamesById
            ),
          };

          return {
            hospitals: [
              ...state.hospitals.filter((item) => item.id !== hospital.id),
              enrichedHospital,
            ].sort(byHospitalName),
          };
        }),

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

      addLocalAppointment: (appointment, slotKey) =>
        set((state) => {
          const resolvedSlot = slotKey ?? {
            doctorId: appointment.doctorId,
            date: getClinicDateKey(appointment.dateTime),
            time: formatTime(appointment.dateTime),
          };
          const alreadyRecorded = hasDuplicateScheduleSlot(
            state.removedSlots,
            resolvedSlot
          );
          const nextLocations =
            appointment.hospitalName && appointment.hospitalAddress
              ? {
                  ...state.appointmentLocationsById,
                  [appointment.id]: {
                    hospitalId: appointment.hospitalId ?? null,
                    hospitalName: appointment.hospitalName,
                    hospitalAddress: appointment.hospitalAddress,
                  },
                }
              : state.appointmentLocationsById;

          return {
            localAppointments: [
              ...state.localAppointments.filter(
                (item) => item.id !== appointment.id
              ),
              appointment,
            ].sort(byAppointmentChronological),
            scheduleSlots: state.scheduleSlots.filter(
              (slot) =>
                !(
                  slot.doctorId === resolvedSlot.doctorId &&
                  slot.date === resolvedSlot.date &&
                  slot.time === resolvedSlot.time
                )
            ),
            removedSlots: alreadyRecorded
              ? state.removedSlots
              : [...state.removedSlots, resolvedSlot],
            appointmentLocationsById: nextLocations,
          };
        }),

      consumeScheduleSlot: (doctorId, date, time) =>
        set((state) => ({
          scheduleSlots: state.scheduleSlots.filter(
            (slot) =>
              !(
                slot.doctorId === doctorId &&
                slot.date === date &&
                slot.time === time
              )
          ),
        })),

      cancelLocalAppointment: (appointmentId) =>
        set((state) => {
          const target = state.localAppointments.find(
            (item) => item.id === appointmentId
          );
          if (!target) return state;

          const targetDate = getClinicDateKey(target.dateTime);
          const targetTime = formatTime(target.dateTime);

          return {
            localAppointments: state.localAppointments.map((item) =>
              item.id === appointmentId
                ? { ...item, status: "CANCELADO" }
                : item
            ),
            removedSlots: state.removedSlots.filter(
              (removed) =>
                !(
                  removed.doctorId === target.doctorId &&
                  removed.date === targetDate &&
                  removed.time === targetTime
                )
            ),
          };
        }),

      rescheduleLocalAppointment: (appointmentId, date, time) =>
        set((state) => {
          const target = state.localAppointments.find(
            (item) => item.id === appointmentId
          );
          if (!target) return state;

          const prevDate = getClinicDateKey(target.dateTime);
          const prevTime = formatTime(target.dateTime);
          const nextDateTime = new Date(
            `${date}T${time}:00-03:00`
          ).toISOString();
          const nextSlot = { doctorId: target.doctorId, date, time };

          const filteredRemoved = state.removedSlots.filter(
            (removed) =>
              !(
                removed.doctorId === target.doctorId &&
                removed.date === prevDate &&
                removed.time === prevTime
              )
          );
          const alreadyRecorded = hasDuplicateScheduleSlot(
            filteredRemoved,
            nextSlot
          );

          return {
            localAppointments: state.localAppointments
              .map((item) =>
                item.id === appointmentId
                  ? { ...item, dateTime: nextDateTime, status: "AGENDADO" as const }
                  : item
              )
              .sort(byAppointmentChronological),
            scheduleSlots: state.scheduleSlots.filter(
              (slot) =>
                !(
                  slot.doctorId === nextSlot.doctorId &&
                  slot.date === nextSlot.date &&
                  slot.time === nextSlot.time
                )
            ),
            removedSlots: alreadyRecorded
              ? filteredRemoved
              : [...filteredRemoved, nextSlot],
          };
        }),

      setAppointmentLocation: (appointmentId, location) =>
        set((state) => ({
          appointmentLocationsById: {
            ...state.appointmentLocationsById,
            [appointmentId]: location,
          },
        })),

      resetLocalAdminData: () =>
        set({
          specialties: [],
          doctors: [],
          deletedDoctorIds: [],
          hospitals: [],
          scheduleSlots: [],
          removedSlots: [],
          localAppointments: [],
          appointmentLocationsById: {},
        }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: ADMIN_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        specialties: state.specialties,
        doctors: state.doctors,
        deletedDoctorIds: state.deletedDoctorIds,
        hospitals: state.hospitals,
        scheduleSlots: state.scheduleSlots,
        removedSlots: state.removedSlots,
        localAppointments: state.localAppointments,
        appointmentLocationsById: state.appointmentLocationsById,
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

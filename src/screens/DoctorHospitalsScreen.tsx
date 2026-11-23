import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import {
  AppScreenHeader,
  FLOATING_TAB_BAR_SCROLL_OFFSET,
} from "@/components";
import { HospitalIcon } from "@/navigation/icons";
import type { DoctorTabParamList } from "@/navigation/types";
import { catalogService, type Specialty } from "@/services/catalog.service";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import { resolveDoctorLinkedHospitals } from "@/utils/adminRules";
import { resolveHospitalSpecialties } from "@/utils/specialties";

type Props = BottomTabScreenProps<DoctorTabParamList, "DoctorHospitals">;

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#0e706f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

// Tela de hospitais vinculados ao medico autenticado com especialidades resolvidas e destacadas.
export function DoctorHospitalsScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);
  const doctors = useAdminStore((s) => s.doctors);
  const hospitals = useAdminStore((s) => s.hospitals);
  const storedSpecialties = useAdminStore((s) => s.specialties);

  const [catalogSpecialties, setCatalogSpecialties] = useState<Specialty[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;

  const loadSpecialties = useCallback(async () => {
    try {
      const list = await catalogService.listSpecialties();
      setCatalogSpecialties(list);
    } catch {
      // Preserva as especialidades ja sincronizadas na store caso a chamada falhe.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSpecialties();
    }, [loadSpecialties])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSpecialties();
    } finally {
      setRefreshing(false);
    }
  };

  const { linkedHospitals, doctorSpecialtyIds } = useMemo(
    () => resolveDoctorLinkedHospitals(user, doctors, hospitals),
    [user, doctors, hospitals]
  );

  const doctorSpecialtyIdSet = useMemo(
    () => new Set(doctorSpecialtyIds.map((id) => id.trim().toLowerCase())),
    [doctorSpecialtyIds]
  );

  const combinedSpecialties = useMemo(() => {
    const doctorPairs = doctors.flatMap((doc) =>
      doc.specialtyIds.map((id, idx) => ({
        id,
        name: doc.specialtyNames[idx] ?? "",
        description: null,
      }))
    );
    return [...storedSpecialties, ...catalogSpecialties, ...doctorPairs];
  }, [catalogSpecialties, doctors, storedSpecialties]);

  const summaryCountText =
    linkedHospitals.length === 0
      ? "Nenhuma unidade vinculada"
      : linkedHospitals.length === 1
        ? "1 unidade vinculada"
        : `${linkedHospitals.length} unidades vinculadas`;

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Hospitais"
        subtitle="Unidades vinculadas ao seu atendimento."
        icon={<HospitalIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-5 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor="#0e706f"
            colors={["#0e706f"]}
          />
        }
      >
        <View
          style={styles.cardShadow}
          className="flex-row flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e6ecee] bg-white p-4"
        >
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-base font-bold text-[#004959]">
              {summaryCountText}
            </Text>
            <Text className="text-xs text-[#6b7280]">
              Vínculos atualizados pela administração da clínica.
            </Text>
          </View>

          {user?.crm ? (
            <View className="rounded-full bg-[#dbf0ef] px-3 py-1">
              <Text className="text-xs font-bold text-[#004959]">
                CRM {user.crm}
              </Text>
            </View>
          ) : null}
        </View>

        {linkedHospitals.length === 0 ? (
          <View
            style={styles.cardShadow}
            className="gap-2 rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-5"
          >
            <Text className="text-base font-bold text-[#004959]">
              Nenhum hospital vinculado ao seu perfil
            </Text>
            <Text className="text-sm leading-relaxed text-[#004959]">
              Nenhuma unidade foi vinculada ao seu cadastro até o momento. Caso
              precise atuar em um novo hospital, procure a administração.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {linkedHospitals.map((hospital) => {
              const resolvedSpecialties = resolveHospitalSpecialties(
                hospital.specialtyIds,
                combinedSpecialties,
                hospital.specialtyNamesById
              );

              return (
                <View
                  key={hospital.id}
                  style={styles.cardShadow}
                  className="gap-3.5 rounded-2xl border border-[#e6ecee] bg-white p-4"
                >
                  <View className="flex-row items-center gap-3.5">
                    <View className="h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dff4f2]">
                      <HospitalIcon color="#0e706f" size={24} />
                    </View>

                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-base font-bold text-[#004959]">
                        {hospital.name}
                      </Text>
                      <Text className="text-sm text-[#4b5563]">
                        {hospital.address}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2 border-t border-[#eef2f4] pt-3">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                      Especialidades atendidas na unidade
                    </Text>

                    {resolvedSpecialties.length === 0 ? (
                      <Text className="text-xs text-[#6b7280]">
                        Nenhuma especialidade informada
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap gap-2">
                        {resolvedSpecialties.map((spec) => {
                          const isDoctorSpecialty = doctorSpecialtyIdSet.has(
                            spec.id.toLowerCase()
                          );

                          return (
                            <View
                              key={`${hospital.id}-${spec.id}-${spec.name}`}
                              className={`rounded-full border px-3 py-1 ${
                                isDoctorSpecialty
                                  ? "border-[#0e706f] bg-[#dff4f2]"
                                  : "border-[#e6ecee] bg-[#f6f8f9]"
                              }`}
                            >
                              <Text
                                className={`text-xs ${
                                  isDoctorSpecialty
                                    ? "font-bold text-[#0e706f]"
                                    : "font-medium text-[#4b5563]"
                                }`}
                              >
                                {spec.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import { Button, Modal, PatientScreenHeader } from "@/components";
import type { PatientStackParamList } from "@/navigation/types";
import { prescriptionService } from "@/services/prescription.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  matchesPatientPrescription,
  usePrescriptionStore,
} from "@/stores/prescription.store";
import type { Prescription } from "@/types/prescription";
import { formatLongDate, formatTime } from "@/utils/date";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientPrescriptions"
>;

const ICON_MINHAS_RECEITAS =
  require("../../assets/icons/icone-minhas-receitas.png") as ImageSourcePropType;

function ChevronRightMutedIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#64748b"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

function PrescriptionCard({
  item,
  onPress,
}: {
  item: Prescription;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Receita de ${item.medicationName}, ${item.dosageMg}, emitida por ${item.doctorName} em ${formatLongDate(item.createdAt)}`}
      className="min-h-[64px] w-full flex-row items-center gap-3.5 rounded-2xl border border-line bg-[#f6f8f9] p-4 active:opacity-85"
    >
      <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
        <Image
          source={ICON_MINHAS_RECEITAS}
          resizeMode="contain"
          style={{ width: 40, height: 40 }}
        />
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 text-base font-bold text-ink">
            {item.medicationName}
          </Text>
          <View className="rounded-full bg-[#dff4f2] px-2.5 py-0.5">
            <Text className="text-xs font-bold text-[#0e706f]">
              {item.dosageMg}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} className="text-sm text-muted">
          {item.doctorName}
        </Text>

        <Text className="text-xs font-semibold text-[#0e706f]">
          Emitida em {formatLongDate(item.createdAt)}
        </Text>
      </View>

      <ChevronRightMutedIcon />
    </Pressable>
  );
}

// Listagem de receitas enviadas pelo medico para o paciente autenticado.
export function PatientPrescriptionsScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const allPrescriptions = usePrescriptionStore((s) => s.prescriptions);
  const hasHydrated = usePrescriptionStore((s) => s._hasHydrated);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const patientPrescriptions = useMemo(() => {
    if (!user) return [];
    return allPrescriptions.filter((item) =>
      matchesPatientPrescription(item, { id: user.id, name: user.name })
    );
  }, [allPrescriptions, user]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await prescriptionService.listByPatient({ id: user.id, name: user.name });
    } finally {
      setRefreshing(false);
    }
  };

  const renderEmpty = () => {
    if (!hasHydrated) {
      return (
        <View className="items-center justify-center gap-3 rounded-2xl border border-line bg-white p-8">
          <ActivityIndicator size="large" color="#0e706f" />
          <Text className="text-sm text-muted">Carregando receitas...</Text>
        </View>
      );
    }

    return (
      <View className="items-center gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-6">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
          <Image
            source={ICON_MINHAS_RECEITAS}
            resizeMode="contain"
            style={{ width: 46, height: 46 }}
          />
        </View>

        <Text className="text-center text-lg font-bold text-ink">
          Nenhuma receita recebida
        </Text>

        <Text className="text-center text-sm leading-relaxed text-muted">
          Quando um médico enviar uma prescrição após seu atendimento, ela
          aparecerá aqui com dosagem e instruções completas.
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <PatientScreenHeader
        title="Minhas receitas"
        subtitle="Consulte suas prescrições médicas."
        onBackPress={() => navigation.goBack()}
        backAccessibilityLabel="Voltar"
        imageSource={ICON_MINHAS_RECEITAS}
      />

      <FlatList
        data={hasHydrated ? patientPrescriptions : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PrescriptionCard item={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="flex-grow px-5 pt-5"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
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
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Detalhes da receita"
        closeLabel="Fechar detalhes da receita"
      >
        {selected ? (
          <View className="gap-4">
            <View className="gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <View className="gap-0.5 border-b border-line/70 pb-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Medicamento
                </Text>
                <Text className="text-lg font-bold text-ink">
                  {selected.medicationName}
                </Text>
              </View>

              <View className="gap-0.5 border-b border-line/70 pb-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Dosagem
                </Text>
                <Text className="text-base font-bold text-[#0e706f]">
                  {selected.dosageMg}
                </Text>
              </View>

              <View className="gap-1 border-b border-line/70 pb-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Como tomar por dia
                </Text>
                <Text className="text-base leading-relaxed text-ink">
                  {selected.dailyInstructions}
                </Text>
              </View>

              <View className="gap-0.5">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Médico e data
                </Text>
                <Text className="text-sm font-bold text-ink">
                  {selected.doctorName} · CRM {selected.doctorCrm}
                </Text>
                <Text className="text-xs text-muted">
                  Emitida em {formatLongDate(selected.createdAt)} às{" "}
                  {formatTime(selected.createdAt)}
                </Text>
              </View>
            </View>

            <Button
              label="Fechar"
              accessibilityLabel="Fechar detalhes da receita"
              onPress={() => setSelected(null)}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

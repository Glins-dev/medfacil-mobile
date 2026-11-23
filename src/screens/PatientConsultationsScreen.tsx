import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";

import { BrandLogo, Button, DateBadge } from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type {
  PatientStackParamList,
  PatientTabParamList,
} from "@/navigation/types";
import type { Appointment, AppointmentStatus } from "@/services/appointment.service";
import {
  getEffectiveAppointmentStatus,
  useAppointments,
  useAppointmentStore,
  type AttendanceConfirmationStatus,
} from "@/stores/appointment.store";
import {
  describeDate,
  formatDayMonth,
  formatTime,
  formatWeekdayLong,
  getClinicDateKey,
  getPeriod,
} from "@/utils/date";

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "PatientConsultations">,
  NativeStackScreenProps<PatientStackParamList>
>;

type ConsultationFilter = "ALL" | "UPCOMING" | "HISTORY";

type VisualStatus = "AGENDADO" | "CONFIRMADO" | "CONCLUIDO" | "CANCELADO";

interface StatusConfig {
  label: string;
  badgeClass: string;
  textClass: string;
  iconColor: string;
}

const STATUS_STYLE: Record<VisualStatus, StatusConfig> = {
  AGENDADO: {
    label: "Agendado",
    badgeClass: "bg-brand/10 border border-brand/30",
    textClass: "text-brand-dark",
    iconColor: "#004959",
  },
  CONFIRMADO: {
    label: "Confirmado",
    badgeClass: "bg-success/15 border border-success/40",
    textClass: "text-brand-dark",
    iconColor: "#004959",
  },
  CONCLUIDO: {
    label: "Concluído",
    badgeClass: "bg-brand-light/15 border border-brand-light/40",
    textClass: "text-brand-dark",
    iconColor: "#004959",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "bg-danger/10 border border-danger/30",
    textClass: "text-danger",
    iconColor: "#d64545",
  },
};

function resolveVisualStatus(
  status: AppointmentStatus,
  dateTime: string,
  nowIso: string
): VisualStatus {
  if (status === "CANCELADO") return "CANCELADO";
  if (status === "CONCLUIDO") return "CONCLUIDO";
  if (dateTime < nowIso) return "CONCLUIDO";
  return status;
}

function StatusIcon({
  status,
  color,
}: {
  status: VisualStatus;
  color: string;
}) {
  if (status === "CANCELADO") {
    return (
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M18 6 6 18M6 6l12 12" />
      </Svg>
    );
  }

  if (status === "AGENDADO") {
    return (
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 7v5l3 2" />
      </Svg>
    );
  }

  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function ConsultationCard({
  item,
  nowIso,
  attendance,
  onPress,
}: {
  item: Appointment;
  nowIso: string;
  attendance?: AttendanceConfirmationStatus;
  onPress: () => void;
}) {
  const effectiveStatus = getEffectiveAppointmentStatus(item, attendance);
  const visualStatus = resolveVisualStatus(
    effectiveStatus,
    item.dateTime,
    nowIso
  );
  const badge = STATUS_STYLE[visualStatus];
  const dateInfo = describeDate(getClinicDateKey(item.dateTime));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes da consulta de ${item.specialty ?? "Consulta"} com ${item.doctorName}, status ${badge.label}, ${formatDayMonth(item.dateTime)} às ${formatTime(item.dateTime)}`}
      className="min-h-[72px] gap-3 rounded-2xl border border-line bg-white p-4 active:opacity-85"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${badge.badgeClass}`}
        >
          <StatusIcon status={visualStatus} color={badge.iconColor} />
          <Text className={`text-xs font-bold ${badge.textClass}`}>
            {badge.label}
          </Text>
        </View>

        <Text className="text-xs font-semibold text-muted">
          {getPeriod(item.dateTime)}
        </Text>
      </View>

      <View className="flex-row items-center gap-4">
        <DateBadge day={dateInfo.day} month={dateInfo.month} />

        <View className="min-w-0 flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-lg font-bold text-ink">
            {item.specialty ?? "Consulta"}
          </Text>
          <Text numberOfLines={1} className="text-sm text-muted">
            {item.doctorName}
          </Text>
          <Text className="text-xs text-muted">
            {CLINIC_INFO.name} · {CLINIC_INFO.neighborhood}
          </Text>
          <Text className="mt-1 text-xs font-medium text-muted">
            {formatWeekdayLong(item.dateTime)}
          </Text>
          <Text className="text-sm font-bold text-brand-dark">
            {formatDayMonth(item.dateTime)} · {formatTime(item.dateTime)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const FILTER_OPTIONS: { key: ConsultationFilter; label: string }[] = [
  { key: "ALL", label: "Todas" },
  { key: "UPCOMING", label: "Futuras" },
  { key: "HISTORY", label: "Histórico" },
];

// Listagem de consultas futuras e historico do paciente com filtro e atualizacao.
export function PatientConsultationsScreen({ navigation }: Props) {
  const { appointments, status, reload } = useAppointments();
  const attendanceById = useAppointmentStore((s) => s.attendanceById);
  const [filter, setFilter] = useState<ConsultationFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;
  const scrollBottomPadding = 104 + insets.bottom;

  const nowIso = new Date().toISOString();

  const filteredAppointments = useMemo(() => {
    if (filter === "ALL") return appointments;

    return appointments.filter((item) => {
      const effectiveStatus = getEffectiveAppointmentStatus(
        item,
        attendanceById[item.id]
      );
      const visual = resolveVisualStatus(
        effectiveStatus,
        item.dateTime,
        nowIso
      );
      const isUpcoming = visual === "AGENDADO" || visual === "CONFIRMADO";
      return filter === "UPCOMING" ? isUpcoming : !isUpcoming;
    });
  }, [appointments, attendanceById, filter, nowIso]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View className="gap-4 pb-4">
      <View>
        <View className="flex-row items-center justify-between gap-3">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Consultas
          </Text>
          <BrandLogo height={26} />
        </View>
        <Text className="mt-1 text-base text-muted">
          Acompanhe seus horários agendados e seu histórico.
        </Text>
      </View>

      <View className="flex-row gap-2">
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${option.label}`}
              accessibilityState={{ selected: active }}
              className={`min-h-[48px] flex-1 items-center justify-center rounded-xl border px-3 ${
                active
                  ? "border-brand bg-brand"
                  : "border-line bg-white"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-white" : "text-ink"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (status === "loading") {
      return (
        <View className="items-center justify-center gap-3 rounded-2xl border border-line bg-white p-8">
          <ActivityIndicator size="large" color="#0e706f" />
          <Text className="text-sm text-muted">
            Carregando suas consultas...
          </Text>
        </View>
      );
    }

    if (status === "error") {
      return (
        <View className="gap-4 rounded-2xl border border-line bg-white p-6">
          <Text className="text-base font-semibold text-ink">
            Não foi possível carregar suas consultas.
          </Text>
          <Text className="text-sm text-muted">
            Verifique sua conexão e tente novamente.
          </Text>
          <Button
            label="Tentar novamente"
            variant="outline"
            onPress={() => {
              void reload();
            }}
          />
        </View>
      );
    }

    const emptyTitle =
      filter === "HISTORY"
        ? "Nenhuma consulta no histórico"
        : filter === "UPCOMING"
          ? "Nenhuma consulta futura"
          : "Você ainda não tem consultas";

    return (
      <View className="gap-4 rounded-2xl border border-line bg-white p-6">
        <View className="gap-1">
          <Text className="text-lg font-bold text-ink">{emptyTitle}</Text>
          <Text className="text-sm text-muted">
            {filter === "ALL" || filter === "UPCOMING"
              ? "Agende uma nova consulta em poucos passos."
              : "Consultas concluídas ou canceladas aparecerão aqui."}
          </Text>
        </View>

        {filter !== "ALL" ? (
          <Button
            label="Mostrar todas"
            variant="outline"
            onPress={() => setFilter("ALL")}
          />
        ) : (
          <Button
            label="Agendar consulta"
            onPress={() => navigation.navigate("PatientSchedule")}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-white"
    >
      <FlatList
        data={status === "ready" ? filteredAppointments : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConsultationCard
            item={item}
            nowIso={nowIso}
            attendance={attendanceById[item.id]}
            onPress={() =>
              navigation.navigate("PatientAppointmentDetails", {
                appointmentId: item.id,
              })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="flex-grow px-5 pt-3"
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
      />
    </SafeAreaView>
  );
}

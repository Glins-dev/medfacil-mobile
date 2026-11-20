import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Path } from "react-native-svg";

import { Button, DateBadge } from "@/components";
import type { PatientTabParamList } from "@/navigation/types";
import type { Appointment, AppointmentStatus } from "@/services/appointment.service";
import { useAppointments } from "@/stores/appointment.store";
import {
  describeDate,
  formatLongDate,
  formatTime,
  getClinicDateKey,
  getPeriod,
} from "@/utils/date";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientConsultations">;

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
}: {
  item: Appointment;
  nowIso: string;
}) {
  const visualStatus = resolveVisualStatus(item.status, item.dateTime, nowIso);
  const badge = STATUS_STYLE[visualStatus];
  const dateInfo = describeDate(getClinicDateKey(item.dateTime));

  return (
    <View className="gap-3 rounded-2xl border border-line bg-white p-4">
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
          <Text className="mt-0.5 text-sm font-semibold text-brand">
            {formatLongDate(item.dateTime)} · {formatTime(item.dateTime)}
          </Text>
        </View>
      </View>
    </View>
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
  const [filter, setFilter] = useState<ConsultationFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const nowIso = new Date().toISOString();

  const filteredAppointments = useMemo(() => {
    if (filter === "ALL") return appointments;

    return appointments.filter((item) => {
      const visual = resolveVisualStatus(item.status, item.dateTime, nowIso);
      const isUpcoming = visual === "AGENDADO" || visual === "CONFIRMADO";
      return filter === "UPCOMING" ? isUpcoming : !isUpcoming;
    });
  }, [appointments, filter, nowIso]);

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
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-ink"
        >
          Consultas
        </Text>
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
      edges={["top", "left", "right"]}
      className="flex-1 bg-brand-cream"
    >
      <FlatList
        data={status === "ready" ? filteredAppointments : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConsultationCard item={item} nowIso={nowIso} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="flex-grow px-5 pb-8 pt-4"
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

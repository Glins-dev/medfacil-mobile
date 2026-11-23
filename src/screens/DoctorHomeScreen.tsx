import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import {
  AppScreenHeader,
  Button,
  DateBadge,
  FLOATING_TAB_BAR_SCROLL_OFFSET,
  SendPrescriptionModal,
} from "@/components";
import { PatientPreChartModal } from "@/components/doctor/PatientPreChartModal";
import { StethoscopeIcon } from "@/navigation/icons";
import type { DoctorTabParamList } from "@/navigation/types";
import { getApiErrorMessage } from "@/services/api";
import type { AppointmentStatus } from "@/services/appointment.service";
import { authService } from "@/services/auth.service";
import {
  doctorService,
  type AttendanceStatus,
  type DoctorAppointment,
} from "@/services/doctor.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  describeDate,
  describeDayHeading,
  formatTime,
  getClinicDateKey,
  getPeriod,
} from "@/utils/date";

type Props = BottomTabScreenProps<DoctorTabParamList, "DoctorHome">;
type LoadStatus = "loading" | "ready" | "error";

const UPCOMING_LIMIT = 10;

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#0e706f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  AGUARDANDO: "Aguardando",
  EM_ESPERA: "Em espera",
  EM_ATENDIMENTO: "Em atendimento",
  FINALIZADO: "Finalizado",
};

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  AGENDADO: "Agendada",
  CONFIRMADO: "Confirmada",
  CONCLUIDO: "Concluída",
  CANCELADO: "Cancelada",
};

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveStatusLabel(appointment: DoctorAppointment): string {
  if (appointment.attendanceStatus === "AGUARDANDO") {
    return APPOINTMENT_STATUS_LABEL[appointment.status];
  }
  return ATTENDANCE_LABEL[appointment.attendanceStatus];
}

function resolveStatusBadgeStyle(
  appointment: DoctorAppointment,
  highlighted: boolean
): { containerClass: string; textClass: string } {
  if (appointment.status === "CANCELADO") {
    return {
      containerClass: "border border-danger/30 bg-danger/10",
      textClass: "text-danger",
    };
  }

  const isWaiting =
    (appointment.attendanceStatus === "AGUARDANDO" &&
      appointment.status === "AGENDADO") ||
    appointment.attendanceStatus === "EM_ESPERA";

  if (isWaiting) {
    return {
      containerClass: "border border-[#e5b12c] bg-[#F7C343]/35",
      textClass: "text-[#004959]",
    };
  }

  return {
    containerClass: highlighted ? "bg-white" : "bg-[#dbf0ef]",
    textClass: "text-[#0e706f]",
  };
}

function formatWhenLabel(
  appointment: DoctorAppointment,
  todayKey: string
): string {
  const key = getClinicDateKey(appointment.dateTime);
  const time = formatTime(appointment.dateTime);
  const period = getPeriod(appointment.dateTime);

  if (key === todayKey) {
    return `Hoje às ${time} (${period})`;
  }
  return `${key.slice(8, 10)}/${key.slice(5, 7)} às ${time} (${period})`;
}

function DoctorAppointmentCard({
  item,
  todayKey,
  highlighted = false,
  onSendPrescription,
  onViewPreChart,
}: {
  item: DoctorAppointment;
  todayKey: string;
  highlighted?: boolean;
  onSendPrescription: () => void;
  onViewPreChart: () => void;
}) {
  const dateInfo = describeDate(getClinicDateKey(item.dateTime));
  const statusStyle = resolveStatusBadgeStyle(item, highlighted);

  return (
    <View
      style={styles.cardShadow}
      className={`gap-3.5 rounded-2xl border p-4 ${
        highlighted
          ? "border-[#b9e4e1] bg-[#dbf0ef]"
          : "border-[#e6ecee] bg-white"
      }`}
    >
      <View className="flex-row items-center gap-3.5">
        <DateBadge day={dateInfo.day} month={dateInfo.month} />

        <View className="min-w-0 flex-1 gap-1">
          <Text
            numberOfLines={1}
            className="text-lg font-bold text-[#004959]"
          >
            {item.patientName}
          </Text>
          <Text numberOfLines={1} className="text-sm text-[#6b7280]">
            {item.reason ?? "Consulta"}
          </Text>
          <Text className="text-sm font-semibold text-[#0e706f]">
            {highlighted
              ? formatWhenLabel(item, todayKey)
              : `${formatTime(item.dateTime)} · ${getPeriod(item.dateTime)}`}
          </Text>
          <View
            className={`mt-0.5 self-start rounded-full px-2.5 py-0.5 ${statusStyle.containerClass}`}
          >
            <Text className={`text-xs font-bold ${statusStyle.textClass}`}>
              {resolveStatusLabel(item)}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-2.5">
        <Button
          label="Enviar receita"
          variant="primary"
          accessibilityLabel={`Enviar receita para ${item.patientName}`}
          onPress={onSendPrescription}
        />

        <Pressable
          onPress={onViewPreChart}
          accessibilityRole="button"
          accessibilityLabel={`Ver pré-prontuário de ${item.patientName}`}
          className="min-h-[48px] w-full items-center justify-center rounded-2xl border-[1.5px] border-[#0e706f] bg-white px-4 py-3 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#0e706f]">
            Ver pré-prontuário
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Tela inicial do medico alinhada a identidade visual do app com proximas consultas e envio de receitas.
export function DoctorHomeScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [prescriptionTarget, setPrescriptionTarget] =
    useState<DoctorAppointment | null>(null);
  const [preChartTarget, setPreChartTarget] =
    useState<DoctorAppointment | null>(null);
  const [sentNotice, setSentNotice] = useState("");

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const todayKey = getClinicDateKey(new Date().toISOString());
  const todayLabel = capitalizeFirst(describeDate(todayKey).long);

  const fetchUpcoming = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setStatus("loading");
    }
    setErrorMessage("");

    try {
      const items = await doctorService.listUpcoming(UPCOMING_LIMIT);
      const sorted = [...items].sort((a, b) =>
        a.dateTime.localeCompare(b.dateTime)
      );
      setAppointments(sorted);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Não foi possível carregar suas consultas.")
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void fetchUpcoming();
  }, [fetchUpcoming]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUpcoming(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Logout local ocorre independentemente da resposta do servidor.
    } finally {
      logout();
      setLoggingOut(false);
    }
  };

  const nextAppointment = appointments[0] ?? null;

  const groupedRemaining = useMemo(() => {
    const remaining = appointments.slice(1);
    const groups = new Map<string, DoctorAppointment[]>();
    for (const item of remaining) {
      const dayKey = getClinicDateKey(item.dateTime);
      const list = groups.get(dayKey) ?? [];
      list.push(item);
      groups.set(dayKey, list);
    }
    return [...groups.entries()];
  }, [appointments]);

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title={`Olá${firstName ? `, Dr(a). ${firstName}` : ""}`}
        subtitle="Acompanhe seus atendimentos e prescrições."
        onLogoutPress={() => {
          void handleLogout();
        }}
        logoutDisabled={loggingOut}
        icon={<StethoscopeIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-6 px-5 pt-6"
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
          className="gap-2 rounded-2xl border border-[#e6ecee] bg-white p-4"
        >
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-base font-bold text-[#004959]">
              {todayLabel}
            </Text>
            {user?.crm ? (
              <View className="rounded-full bg-[#dbf0ef] px-3 py-1">
                <Text className="text-xs font-bold text-[#004959]">
                  CRM {user.crm}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm text-[#6b7280]">
            {status === "ready"
              ? appointments.length === 1
                ? "1 consulta agendada na fila de atendimento."
                : `${appointments.length} consultas agendadas na fila de atendimento.`
              : status === "loading"
                ? "Carregando atendimentos do dia..."
                : "Não foi possível atualizar o resumo."}
          </Text>
        </View>

        {sentNotice ? (
          <View
            accessibilityRole="alert"
            className="rounded-2xl border border-[#0e706f]/30 bg-[#dbf0ef] px-4 py-3.5"
          >
            <Text className="text-sm font-semibold text-[#004959]">
              {sentNotice}
            </Text>
          </View>
        ) : null}

        {status === "loading" ? (
          <View
            style={styles.cardShadow}
            className="min-h-[140px] items-center justify-center gap-3 rounded-2xl border border-[#e6ecee] bg-white p-6"
          >
            <ActivityIndicator size="large" color="#0e706f" />
            <Text className="text-sm text-[#6b7280]">
              Carregando suas próximas consultas...
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View
            style={styles.cardShadow}
            className="gap-4 rounded-2xl border border-[#e6ecee] bg-white p-5"
          >
            <Text className="text-base font-semibold text-[#004959]">
              {errorMessage || "Não foi possível carregar suas consultas."}
            </Text>
            <Button
              label="Tentar novamente"
              variant="outline"
              onPress={() => {
                void fetchUpcoming();
              }}
            />
          </View>
        ) : null}

        {status === "ready" && appointments.length === 0 ? (
          <View className="gap-3">
            <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
              <Text className="text-base font-bold text-[#004959]">
                Nenhuma consulta agendada
              </Text>
              <Text className="mt-1 text-sm text-[#004959]/90">
                Você não tem atendimentos futuros no momento. Puxe para baixo ou
                atualize a lista.
              </Text>
            </View>
            <Button
              label="Atualizar lista"
              variant="outline"
              onPress={() => {
                void fetchUpcoming();
              }}
            />
          </View>
        ) : null}

        {status === "ready" && nextAppointment ? (
          <View className="gap-3">
            <Text className="text-xl font-bold text-[#004959]">
              Próximo atendimento
            </Text>

            <DoctorAppointmentCard
              item={nextAppointment}
              todayKey={todayKey}
              highlighted
              onSendPrescription={() => {
                setSentNotice("");
                setPrescriptionTarget(nextAppointment);
              }}
              onViewPreChart={() => setPreChartTarget(nextAppointment)}
            />
          </View>
        ) : null}

        {status === "ready" && groupedRemaining.length > 0 ? (
          <View className="gap-4">
            <Text className="text-xl font-bold text-[#004959]">
              Próximas consultas
            </Text>

            {groupedRemaining.map(([dayKey, items]) => (
              <View key={dayKey} className="gap-2.5">
                <Text className="text-sm font-bold text-[#0e706f]">
                  {capitalizeFirst(describeDayHeading(dayKey))}
                </Text>

                <View className="gap-3">
                  {items.map((item) => (
                    <DoctorAppointmentCard
                      key={item.id}
                      item={item}
                      todayKey={todayKey}
                      onSendPrescription={() => {
                        setSentNotice("");
                        setPrescriptionTarget(item);
                      }}
                      onViewPreChart={() => setPreChartTarget(item)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SendPrescriptionModal
        appointment={prescriptionTarget}
        onClose={() => setPrescriptionTarget(null)}
        onSent={(created) => {
          setPrescriptionTarget(null);
          setSentNotice(
            `Receita de ${created.medicationName} (${created.dosageMg}) enviada para ${created.patientName}.`
          );
        }}
      />

      <PatientPreChartModal
        appointment={preChartTarget}
        onClose={() => setPreChartTarget(null)}
      />
    </View>
  );
}

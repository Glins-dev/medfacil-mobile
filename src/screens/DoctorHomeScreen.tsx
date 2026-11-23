import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { BrandLogo, Button, SendPrescriptionModal } from "@/components";
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
}: {
  item: DoctorAppointment;
  todayKey: string;
  highlighted?: boolean;
  onSendPrescription: () => void;
}) {
  return (
    <View
      className={`gap-3 rounded-2xl border p-4 ${
        highlighted
          ? "border-brand bg-[#dff4f2]"
          : "border-line bg-white"
      }`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-white">
          <Text className="text-base font-bold text-brand-dark">
            {formatTime(item.dateTime)}
          </Text>
        </View>

        <View className="min-w-0 flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-bold text-ink">
            {item.patientName}
          </Text>
          <Text numberOfLines={1} className="text-sm text-muted">
            {item.reason ?? "Consulta"}
          </Text>
          <Text className="text-xs font-semibold text-brand">
            {highlighted
              ? `${formatWhenLabel(item, todayKey)} · ${resolveStatusLabel(item)}`
              : `${resolveStatusLabel(item)} · ${getPeriod(item.dateTime)}`}
          </Text>
        </View>
      </View>

      <Button
        label="Enviar receita"
        variant="primary"
        accessibilityLabel={`Enviar receita para ${item.patientName}`}
        onPress={onSendPrescription}
      />
    </View>
  );
}

// Tela inicial do medico com proximas consultas e envio de receitas sem anexos.
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
  const [sentNotice, setSentNotice] = useState("");

  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;

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
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#f8fbfb",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-[#f8fbfb]"
    >
      <ScrollView
        contentContainerClassName="flex-grow gap-6 px-5 pb-8 pt-3"
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
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            onPress={() => {
              void handleLogout();
            }}
            disabled={loggingOut}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-line bg-white px-4 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand">
              {loggingOut ? "Saindo..." : "Sair"}
            </Text>
          </Pressable>

          <BrandLogo height={26} />
        </View>

        <View className="gap-1">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Olá{firstName ? `, Dr(a). ${firstName}` : ""}
          </Text>
          {user?.crm ? (
            <Text className="text-sm font-bold text-brand-dark">
              CRM {user.crm}
            </Text>
          ) : null}
          <Text className="text-base text-muted">{todayLabel}</Text>
        </View>

        {sentNotice ? (
          <View className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3">
            <Text
              accessibilityRole="alert"
              className="text-sm font-semibold text-brand-dark"
            >
              {sentNotice}
            </Text>
          </View>
        ) : null}

        {status === "loading" ? (
          <View className="min-h-[140px] items-center justify-center gap-3 rounded-3xl border border-line bg-white p-6">
            <ActivityIndicator size="large" color="#0e706f" />
            <Text className="text-sm text-muted">
              Carregando suas próximas consultas...
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View className="gap-4 rounded-2xl border border-line bg-white p-5">
            <Text className="text-base font-semibold text-ink">
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
          <View className="gap-4 rounded-2xl border border-line bg-white p-6">
            <View className="gap-1">
              <Text className="text-lg font-bold text-ink">
                Nenhuma consulta agendada
              </Text>
              <Text className="text-sm text-muted">
                Você não tem consultas agendadas no momento. Puxe para baixo
                para atualizar.
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
            <Text className="text-xl font-bold text-ink">
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
            />
          </View>
        ) : null}

        {status === "ready" && groupedRemaining.length > 0 ? (
          <View className="gap-4">
            <Text className="text-xl font-bold text-ink">
              Próximas consultas
            </Text>

            {groupedRemaining.map(([dayKey, items]) => (
              <View key={dayKey} className="gap-2.5">
                <Text className="text-sm font-bold text-brand-dark">
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
    </SafeAreaView>
  );
}

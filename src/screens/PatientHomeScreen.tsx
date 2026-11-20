import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Path, Rect } from "react-native-svg";

import {
  Button,
  MainCard,
  NoticeCard,
  QuickAccessCard,
} from "@/components";
import type { PatientTabParamList } from "@/navigation/types";
import { authService } from "@/services/auth.service";
import { useNextAppointment } from "@/stores/appointment.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatLongDate, formatTime, getPeriod } from "@/utils/date";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientHome">;

function CalendarPlusIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
    </Svg>
  );
}

function ListIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  );
}

function ClockCalendarIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4M12 13v2.5l1.5 1" />
    </Svg>
  );
}

// Tela inicial do paciente com saudacao, proxima consulta e atalhos rapidos.
export function PatientHomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { appointment, status, reload } = useNextAppointment();
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const firstName = user?.name.split(" ")[0] ?? "";

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
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

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-brand-cream"
    >
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-4"
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
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              void handleLogout();
            }}
            disabled={loggingOut}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
            className="min-h-[48px] min-w-[48px] justify-center rounded-lg px-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand underline">
              {loggingOut ? "Saindo..." : "Sair"}
            </Text>
          </Pressable>

          <Text className="text-lg font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>
        </View>

        <View>
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Olá{firstName ? `, ${firstName}` : ""}
          </Text>
          <Text className="mt-1 text-base text-muted">
            O que você precisa hoje?
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-xl font-bold text-ink">Próxima consulta</Text>

          {status === "loading" ? (
            <View className="min-h-[120px] items-center justify-center gap-2 rounded-3xl border border-line bg-white p-6">
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-muted">
                Carregando sua próxima consulta...
              </Text>
            </View>
          ) : null}

          {status === "error" ? (
            <View className="gap-3 rounded-2xl border border-line bg-white p-4">
              <Text className="text-sm text-ink">
                Não foi possível carregar sua próxima consulta.
              </Text>
              <Button
                label="Tentar novamente"
                variant="outline"
                onPress={() => {
                  void reload();
                }}
              />
            </View>
          ) : null}

          {status === "ready" && appointment ? (
            <MainCard
              title={appointment.specialty ?? "Consulta"}
              description={`${appointment.doctorName}\n${formatLongDate(
                appointment.dateTime
              )} · ${formatTime(appointment.dateTime)} (${getPeriod(
                appointment.dateTime
              )})`}
              actionLabel="Ver consultas"
              onAction={() => navigation.navigate("PatientConsultations")}
            />
          ) : null}

          {status === "ready" && !appointment ? (
            <NoticeCard
              title="Nenhuma consulta marcada"
              subtitle="Você ainda não tem consultas futuras agendadas."
              detail="Toque para agendar agora"
              onPress={() => navigation.navigate("PatientSchedule")}
            />
          ) : null}
        </View>

        <View className="gap-3">
          <Text className="text-xl font-bold text-ink">Acesso rápido</Text>

          <View className="flex-row gap-3">
            <QuickAccessCard
              className="flex-1"
              label="Agendar Consulta"
              subtitle="Escolha especialidade e horário"
              icon={<CalendarPlusIcon />}
              onPress={() => navigation.navigate("PatientSchedule")}
            />
            <QuickAccessCard
              className="flex-1"
              label="Minhas Consultas"
              subtitle="Histórico e status"
              icon={<ListIcon />}
              onPress={() => navigation.navigate("PatientConsultations")}
            />
          </View>

          <QuickAccessCard
            label="Agenda"
            subtitle="Acompanhe seus horários marcados"
            icon={<ClockCalendarIcon />}
            onPress={() => navigation.navigate("PatientAgenda")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

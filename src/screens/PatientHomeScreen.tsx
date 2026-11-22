import { useState } from "react";
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

import {
  Button,
  DateBadge,
  MainCard,
  Modal,
  NoticeCard,
  QuickAccessCard,
} from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientTabParamList } from "@/navigation/types";
import { authService } from "@/services/auth.service";
import { useNextAppointment } from "@/stores/appointment.store";
import { useAuthStore } from "@/stores/auth.store";
import { describeDate, formatTime, getClinicDateKey } from "@/utils/date";
import { MEDICAL_IMAGES } from "@/utils/specialtyIcons";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientHome">;

// Tela inicial do paciente fiel ao design: hero de agendamento, proxima consulta e acesso rapido.
export function PatientHomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { appointment, status, reload } = useNextAppointment();
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const appointmentDateInfo = appointment
    ? describeDate(getClinicDateKey(appointment.dateTime))
    : null;

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
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-3"
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
          <Text className="text-2xl font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>

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

        <MainCard
          title="Agendar consulta"
          description="Escolha a especialidade e o melhor horário."
          actionLabel="Começar"
          imageSource={MEDICAL_IMAGES.doctor}
          imageAlt="Ilustração de profissional médico"
          onAction={() => navigation.navigate("PatientSchedule")}
        />

        <View className="gap-3">
          <Text className="text-xl font-bold text-ink">Próxima consulta</Text>

          {status === "loading" ? (
            <View className="min-h-[104px] items-center justify-center gap-2 rounded-2xl border border-line bg-white p-6">
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

          {status === "ready" && appointment && appointmentDateInfo ? (
            <NoticeCard
              leading={
                <DateBadge
                  day={appointmentDateInfo.day}
                  month={appointmentDateInfo.month}
                />
              }
              title={appointment.specialty ?? "Consulta"}
              subtitle={appointment.doctorName}
              detail={`${formatTime(appointment.dateTime)} · ${CLINIC_INFO.unitLabel}`}
              onPress={() => navigation.navigate("PatientConsultations")}
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
              variant="cream"
              label="Minhas receitas"
              imageSource={MEDICAL_IMAGES.prescription}
              onPress={() => setComingSoonTitle("Minhas receitas")}
            />
            <QuickAccessCard
              className="flex-1"
              variant="cream"
              label="Minha saúde"
              imageSource={MEDICAL_IMAGES.heart}
              onPress={() => setComingSoonTitle("Minha saúde")}
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        open={Boolean(comingSoonTitle)}
        onClose={() => setComingSoonTitle(null)}
        title={comingSoonTitle ?? "Funcionalidade em breve"}
        closeLabel="Fechar aviso"
      >
        <View className="gap-4">
          <Text className="text-base text-ink">
            Funcionalidade em breve. Em atualizações futuras você poderá acessar{" "}
            {comingSoonTitle?.toLowerCase()} diretamente por aqui.
          </Text>
          <Button
            label="Entendi"
            onPress={() => setComingSoonTitle(null)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

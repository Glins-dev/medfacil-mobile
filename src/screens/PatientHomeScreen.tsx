import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Button,
  DateBadge,
  FeatureCard,
  FLOATING_TAB_BAR_SCROLL_OFFSET,
  MainCard,
  Modal,
  NoticeCard,
  PatientScreenHeader,
} from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import { HomeIcon } from "@/navigation/icons";
import type {
  PatientStackParamList,
  PatientTabParamList,
} from "@/navigation/types";
import {
  getEffectiveAppointmentStatus,
  useAppointmentStore,
  useNextAppointment,
} from "@/stores/appointment.store";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { describeDate, formatTime, getClinicDateKey } from "@/utils/date";
import { MEDICAL_IMAGES } from "@/utils/specialtyIcons";

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "PatientHome">,
  NativeStackScreenProps<PatientStackParamList>
>;

const ICON_CONSULTAS =
  require("../../assets/icons/icone-consultas.png") as ImageSourcePropType;
const ICON_MINHAS_RECEITAS =
  require("../../assets/icons/icone-minhas-receitas.png") as ImageSourcePropType;

const styles = StyleSheet.create({
  nextCardShadow: {
    shadowColor: "#0e706f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

// Tela inicial do paciente alinhada ao layout oficial com hero, proxima consulta e funcoes.
export function PatientHomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { appointment, status, reload } = useNextAppointment();
  const attendanceById = useAppointmentStore((s) => s.attendanceById);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const appointmentDateInfo = appointment
    ? describeDate(getClinicDateKey(appointment.dateTime))
    : null;
  const effectiveNextStatus = appointment
    ? getEffectiveAppointmentStatus(appointment, attendanceById[appointment.id])
    : null;
  const nextStatusSuffix =
    effectiveNextStatus === "CONFIRMADO" ? " · Presença confirmada" : "";

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
    <View className="flex-1 bg-[#f8fbfb]">
      <PatientScreenHeader
        title={`Olá${firstName ? `, ${firstName}` : ""}`}
        subtitle="O que você precisa hoje?"
        onLogoutPress={() => {
          void handleLogout();
        }}
        logoutDisabled={loggingOut}
        icon={<HomeIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-6"
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

        <MainCard
          title="Agendar consulta"
          description="Escolha a especialidade e o melhor horário."
          actionLabel="Começar"
          imageSource={MEDICAL_IMAGES.doctor}
          imageAlt="Ilustração de profissional médico"
          onAction={() => navigation.navigate("PatientSchedule")}
        />

        <View className="gap-3">
          <Text className="text-xl font-bold text-[#1f2937]">
            Próxima consulta
          </Text>

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
            <Pressable
              onPress={() =>
                navigation.navigate("PatientAppointmentDetails", {
                  appointmentId: appointment.id,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes da consulta de ${appointment.specialty ?? "Consulta"} com ${appointment.doctorName}`}
              style={styles.nextCardShadow}
              className="min-h-[88px] w-full flex-row items-center gap-4 rounded-2xl bg-[#dbf0ef] p-4 active:opacity-85"
            >
              <DateBadge
                day={appointmentDateInfo.day}
                month={appointmentDateInfo.month}
              />

              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  numberOfLines={1}
                  className="text-lg font-bold text-slate-900"
                >
                  {appointment.specialty ?? "Consulta"}
                </Text>
                <Text numberOfLines={1} className="text-sm text-slate-600">
                  {appointment.doctorName}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-sm font-semibold text-[#0e706f]"
                >
                  {`${formatTime(appointment.dateTime)} · ${
                    appointment.hospitalName ?? CLINIC_INFO.unitLabel
                  }${nextStatusSuffix}`}
                </Text>
              </View>
            </Pressable>
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
          <Text className="text-xl font-bold text-[#1f2937]">
            Todas as funções
          </Text>

          <View className="gap-3.5">
            <FeatureCard
              title="Consultas"
              description="Veja seus horários e acompanhe os atendimentos."
              imageSource={ICON_CONSULTAS}
              onPress={() => navigation.navigate("PatientConsultations")}
            />

            <FeatureCard
              title="Minhas receitas"
              description="Consulte prescrições e orientações médicas."
              imageSource={ICON_MINHAS_RECEITAS}
              onPress={() => navigation.navigate("PatientPrescriptions")}
            />

            <FeatureCard
              title="Minha saúde"
              description="Acompanhe informações importantes sobre sua saúde."
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
    </View>
  );
}

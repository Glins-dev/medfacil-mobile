import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path, Rect } from "react-native-svg";

import { Button } from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientStackParamList } from "@/navigation/types";
import { useAppointmentStore } from "@/stores/appointment.store";
import {
  describeDate,
  formatLongDate,
  formatTime,
  getClinicDateKey,
} from "@/utils/date";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientAttendanceConfirmed"
>;

const CHECK_ICON =
  require("../../assets/icons/check-icon.png") as ImageSourcePropType;

function CalendarSummaryIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  );
}

// Tela de sucesso exibida logo apos confirmar presenca na consulta.
export function PatientAttendanceConfirmedScreen({ navigation, route }: Props) {
  const { appointmentId } = route.params;
  const appointment = useAppointmentStore((s) =>
    s.appointments.find((item) => item.id === appointmentId)
  );
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;
  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  const dateInfo = appointment
    ? describeDate(getClinicDateKey(appointment.dateTime))
    : null;
  const headerSubtitle =
    appointment && dateInfo
      ? `Sua consulta está marcada para ${dateInfo.day} de ${dateInfo.monthLong.toLowerCase()}, às ${formatTime(
          appointment.dateTime
        )}.`
      : "Sua confirmação foi registrada com sucesso.";

  const handleBackToAppointments = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: "PatientTabs", params: { screen: "PatientConsultations" } },
      ],
    });
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#c6eceb",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-[#c6eceb]"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow bg-white"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <LinearGradient
          colors={["#c6eceb", "#8cd5ca"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 28,
            alignItems: "center",
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <Image
            source={CHECK_ICON}
            resizeMode="contain"
            accessibilityLabel="Presença confirmada"
            accessible
            style={{ width: 72, height: 72 }}
          />

          <Text
            accessibilityRole="header"
            className="mt-4 text-center text-2xl font-bold text-[#004959]"
          >
            Presença confirmada!
          </Text>

          <Text className="mt-2 text-center text-base font-medium text-[#004959]/90">
            {headerSubtitle}
          </Text>
        </LinearGradient>

        <View className="flex-1 gap-5 px-5 pt-6">
          {appointment ? (
            <View className="flex-row items-center gap-3.5 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <View className="h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dff4f2]">
                <CalendarSummaryIcon />
              </View>

              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-base font-bold text-ink">
                  {appointment.specialty ?? "Consulta"}
                </Text>
                <Text className="text-sm text-muted">
                  {appointment.doctorName}
                </Text>
                <Text className="mt-1 text-sm font-bold text-[#0e706f]">
                  {formatLongDate(appointment.dateTime)} ·{" "}
                  {formatTime(appointment.dateTime)}
                </Text>
                <Text className="text-xs text-muted">
                  {CLINIC_INFO.unitLabel} · {CLINIC_INFO.address}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="gap-1 rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
            <Text className="text-base font-bold text-[#004959]">
              Tudo certo
            </Text>
            <Text className="text-sm text-[#004959]/90">
              Se precisar, você poderá reagendar pelos detalhes da consulta.
            </Text>
          </View>

          <View className="mt-auto pt-2">
            <Button
              label="Voltar para meus agendamentos"
              variant="primary"
              accessibilityLabel="Voltar para meus agendamentos"
              onPress={handleBackToAppointments}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

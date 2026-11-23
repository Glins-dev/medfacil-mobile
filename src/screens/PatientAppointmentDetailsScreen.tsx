import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import {
  BrandLogo,
  Button,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
} from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientStackParamList } from "@/navigation/types";
import type { AppointmentStatus } from "@/services/appointment.service";
import {
  getEffectiveAppointmentStatus,
  useAppointmentStore,
} from "@/stores/appointment.store";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatLongDate, formatTime, getPeriod } from "@/utils/date";
import { openBestRoute } from "@/utils/maps";
import { getSpecialtyImage } from "@/utils/specialtyIcons";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientAppointmentDetails"
>;

const STATUS_DISPLAY: Record<
  AppointmentStatus,
  { label: string; badgeClass: string; textClass: string }
> = {
  AGENDADO: {
    label: "Agendada",
    badgeClass: "bg-white/95",
    textClass: "text-brand-dark",
  },
  CONFIRMADO: {
    label: "Confirmada",
    badgeClass: "bg-accent",
    textClass: "text-brand-dark",
  },
  CONCLUIDO: {
    label: "Concluída",
    badgeClass: "bg-white/95",
    textClass: "text-brand-dark",
  },
  CANCELADO: {
    label: "Cancelada",
    badgeClass: "bg-white/95",
    textClass: "text-danger",
  },
};

function ArrowLeftWhiteIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function CalendarDetailIcon() {
  return (
    <Svg
      width={20}
      height={20}
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

function ClockDetailIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

function MapPinDetailIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <Circle cx="12" cy="10" r="2.3" />
    </Svg>
  );
}

function RoutePinIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 11 22 2l-9 19-2-8-8-2Z" />
    </Svg>
  );
}

function CheckCircleAmberIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="9" />
      <Path d="m8.5 12.2 2.4 2.4 4.8-4.8" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

function InfoRowCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="flex-row items-center gap-3.5 rounded-2xl border border-line bg-white p-4">
      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10">
        {icon}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </Text>
        <Text className="text-base font-bold text-ink">{value}</Text>
        {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
      </View>
    </View>
  );
}

// Tela de detalhes da consulta com acoes de confirmar presenca, reagendar e cancelar.
export function PatientAppointmentDetailsScreen({ navigation, route }: Props) {
  const { appointmentId } = route.params;
  const user = useAuthStore((s) => s.user);
  const appointment = useAppointmentStore((s) =>
    s.appointments.find((item) => item.id === appointmentId)
  );
  const attendance = useAppointmentStore(
    (s) => s.attendanceById[appointmentId]
  );
  const hospitals = useAdminStore((s) => s.hospitals);
  const appointmentLocationsById = useAdminStore(
    (s) => s.appointmentLocationsById
  );
  const localAppointments = useAdminStore((s) => s.localAppointments);
  const insets = useSafeAreaInsets();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleNotice, setRescheduleNotice] = useState("");

  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0)
        : 0;
  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  if (!appointment) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: "#ffffff" }}
        className="flex-1 bg-white"
      >
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text
            accessibilityRole="header"
            className="text-center text-xl font-bold text-ink"
          >
            Consulta não encontrada
          </Text>
          <Text className="text-center text-sm text-muted">
            Esta consulta pode ter sido cancelada ou removida da sua lista.
          </Text>
          <Button
            label="Voltar"
            variant="outline"
            fullWidth={false}
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const nowIso = new Date().toISOString();
  const effectiveStatus = getEffectiveAppointmentStatus(
    appointment,
    attendance
  );
  const statusBadge = STATUS_DISPLAY[effectiveStatus];
  const isActionable =
    effectiveStatus !== "CANCELADO" &&
    effectiveStatus !== "CONCLUIDO" &&
    appointment.dateTime >= nowIso;

  const attendanceTitle =
    attendance === "CONFIRMED" || effectiveStatus === "CONFIRMADO"
      ? "Presença confirmada"
      : attendance === "DECLINED"
        ? "Indisponibilidade informada"
        : "Confirmação de presença";
  const attendanceSubtitle =
    attendance === "CONFIRMED" || effectiveStatus === "CONFIRMADO"
      ? "Você confirmou que vai comparecer. Toque para revisar."
      : attendance === "DECLINED"
        ? "Você informou que não poderá comparecer. Toque para alterar."
        : "Disponível até 48 horas antes.";

  const savedLocation = appointmentLocationsById[appointment.id];
  const localAppointment = localAppointments.find(
    (item) => item.id === appointment.id
  );
  const linkedHospital =
    hospitals.find(
      (hospital) =>
        (savedLocation?.hospitalId &&
          hospital.id === savedLocation.hospitalId) ||
        (localAppointment?.hospitalId &&
          hospital.id === localAppointment.hospitalId) ||
        hospital.doctorIds.includes(appointment.doctorId)
    ) ?? null;

  const resolvedHospitalName =
    appointment.hospitalName?.trim() ||
    savedLocation?.hospitalName?.trim() ||
    localAppointment?.hospitalName?.trim() ||
    linkedHospital?.name?.trim() ||
    null;
  const resolvedHospitalAddress =
    appointment.hospitalAddress?.trim() ||
    savedLocation?.hospitalAddress?.trim() ||
    localAppointment?.hospitalAddress?.trim() ||
    linkedHospital?.address?.trim() ||
    null;

  const displayLocationTitle = resolvedHospitalName ?? CLINIC_INFO.unitLabel;
  const displayLocationHint =
    resolvedHospitalAddress ?? `${CLINIC_INFO.name} · ${CLINIC_INFO.address}`;
  const routeDestinationName = resolvedHospitalName ?? CLINIC_INFO.name;
  const routeDestinationAddress =
    resolvedHospitalAddress ?? CLINIC_INFO.address;
  const originAddress = user?.endereco ?? user?.address ?? null;

  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={["#0e706f", "#29a4b4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: topInset + 12,
          paddingHorizontal: 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white/20 active:opacity-80"
          >
            <ArrowLeftWhiteIcon />
          </Pressable>

          <View className="rounded-full bg-white/95 px-2.5 py-1">
            <BrandLogo height={18} />
          </View>

          <View
            className={`rounded-full px-3.5 py-1.5 ${statusBadge.badgeClass}`}
          >
            <Text className={`text-xs font-bold ${statusBadge.textClass}`}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text
              accessibilityRole="header"
              className="text-2xl font-bold leading-tight text-white"
            >
              {appointment.specialty ?? "Consulta"}
            </Text>
            <Text className="text-base font-medium text-white">
              {appointment.doctorName}
            </Text>
            <Text className="text-sm text-white/90">Consulta presencial</Text>
          </View>

          <View className="h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 p-2">
            <Image
              source={getSpecialtyImage(appointment.specialty)}
              resizeMode="contain"
              className="h-14 w-14"
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerClassName="flex-grow gap-5 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {rescheduleNotice ? (
          <View className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3">
            <Text className="text-sm font-semibold text-brand-dark">
              {rescheduleNotice}
            </Text>
          </View>
        ) : null}

        <View>
          <Text className="text-xl font-bold text-ink">
            Detalhes da consulta
          </Text>
          <Text className="mt-1 text-sm text-muted">
            Confira as informações antes do atendimento.
          </Text>
        </View>

        <View className="gap-3">
          <InfoRowCard
            icon={<CalendarDetailIcon />}
            label="Data"
            value={formatLongDate(appointment.dateTime)}
          />
          <InfoRowCard
            icon={<ClockDetailIcon />}
            label="Horário"
            value={`${formatTime(appointment.dateTime)} · ${getPeriod(
              appointment.dateTime
            )}`}
          />
          <View className="gap-3.5 rounded-2xl border border-line bg-white p-4">
            <View className="flex-row items-center gap-3.5">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                <MapPinDetailIcon />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Local
                </Text>
                <Text className="text-base font-bold text-ink">
                  {displayLocationTitle}
                </Text>
                <Text className="text-xs text-muted">
                  {displayLocationHint}
                </Text>
              </View>
            </View>

            <View className="border-t border-line/60 pt-3">
              <Pressable
                onPress={() => {
                  void openBestRoute({
                    originAddress,
                    destinationName: routeDestinationName,
                    destinationAddress: routeDestinationAddress,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Veja a melhor rota no Google Maps"
                className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#0e706f] bg-white px-4 py-3 active:opacity-80"
              >
                <RoutePinIcon />
                <Text className="text-sm font-bold text-[#0e706f]">
                  Veja a melhor rota
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {isActionable ? (
          <View className="gap-3 pt-1">
            <Pressable
              onPress={() =>
                navigation.navigate("PatientConfirmAttendance", {
                  appointmentId: appointment.id,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`${attendanceTitle}. ${attendanceSubtitle}`}
              className="min-h-[72px] flex-row items-center justify-between gap-3 rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4 active:opacity-85"
            >
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80">
                <CheckCircleAmberIcon />
              </View>

              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-base font-bold text-brand-dark">
                  {attendanceTitle}
                </Text>
                <Text className="text-xs font-medium text-brand-dark/90">
                  {attendanceSubtitle}
                </Text>
              </View>

              <ChevronRightIcon />
            </Pressable>

            <Button
              label="Reagendar consulta"
              variant="primary"
              accessibilityLabel="Reagendar consulta"
              onPress={() => {
                setRescheduleNotice("");
                setRescheduleOpen(true);
              }}
            />

            <Pressable
              onPress={() => setCancelOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar agendamento"
              className="min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-danger bg-white px-6 py-3 active:opacity-85"
            >
              <Text className="text-base font-semibold text-danger">
                Cancelar agendamento
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <RescheduleAppointmentModal
        appointment={rescheduleOpen ? appointment : null}
        onClose={() => setRescheduleOpen(false)}
        onRescheduled={() => {
          setRescheduleOpen(false);
          setRescheduleNotice(
            "Horário alterado com sucesso. Confira os novos detalhes acima."
          );
        }}
      />

      <CancelAppointmentModal
        appointment={cancelOpen ? appointment : null}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          setCancelOpen(false);
          navigation.replace("PatientAppointmentCanceled");
        }}
      />
    </View>
  );
}

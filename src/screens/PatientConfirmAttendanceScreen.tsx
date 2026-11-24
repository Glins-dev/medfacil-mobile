import { useState } from "react";
import {
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
import Svg, { Path, Rect } from "react-native-svg";

import {
  BrandLogo,
  Button,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
} from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientStackParamList } from "@/navigation/types";
import { getApiErrorMessage } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import { useAppointmentStore } from "@/stores/appointment.store";
import { formatLongDate, formatTime, getPeriod } from "@/utils/date";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientConfirmAttendance"
>;

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

function CalendarCheckWhiteIcon() {
  return (
    <Svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
      <Path d="m9 15 2 2 4-4" />
    </Svg>
  );
}

// Tela para o paciente informar se podera comparecer a consulta selecionada.
export function PatientConfirmAttendanceScreen({ navigation, route }: Props) {
  const { appointmentId } = route.params;
  const appointment = useAppointmentStore((s) =>
    s.appointments.find((item) => item.id === appointmentId)
  );
  const attendance = useAppointmentStore(
    (s) => s.attendanceById[appointmentId]
  );
  const setAttendance = useAppointmentStore((s) => s.setAttendance);
  const insets = useSafeAreaInsets();

  const [unavailableRegistered, setUnavailableRegistered] = useState(
    attendance === "DECLINED"
  );
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

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

  const handleConfirmPresence = async () => {
    if (confirming) return;
    setConfirming(true);
    setConfirmError("");
    try {
      const confirmed = await appointmentService.confirm(appointment.id);
      useAppointmentStore.getState().upsert(confirmed);
      setAttendance(appointment.id, "CONFIRMED");
      navigation.replace("PatientAttendanceConfirmed", {
        appointmentId: appointment.id,
      });
    } catch (error) {
      setConfirmError(
        getApiErrorMessage(error, "Não foi possível confirmar sua presença.")
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleDeclinePresence = () => {
    setAttendance(appointment.id, "DECLINED");
    setUnavailableRegistered(true);
  };

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

          <View className="rounded-full bg-white/95 px-3 py-1.5">
            <BrandLogo height={20} />
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text
              accessibilityRole="header"
              className="text-2xl font-bold leading-tight text-white"
            >
              Confirmar presença
            </Text>
            <Text className="text-sm text-white/95">
              Informe se poderá comparecer.
            </Text>
          </View>

          <View className="h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <CalendarCheckWhiteIcon />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerClassName="flex-grow gap-5 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View className="gap-1.5 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
            Resumo da consulta
          </Text>
          <Text className="text-lg font-bold text-brand-dark">
            {appointment.specialty ?? "Consulta"}
          </Text>
          <Text className="text-sm font-medium text-ink">
            {appointment.doctorName}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-brand">
            {formatLongDate(appointment.dateTime)} ·{" "}
            {formatTime(appointment.dateTime)} ({getPeriod(appointment.dateTime)})
          </Text>
          <Text className="text-xs text-muted">
            {appointment.hospitalName ?? CLINIC_INFO.unitLabel} ·{" "}
            {appointment.hospitalAddress ?? CLINIC_INFO.address}
          </Text>
        </View>

        <View className="gap-1 rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
          <Text className="text-base font-bold text-brand-dark">
            Você poderá comparecer?
          </Text>
          <Text className="text-sm text-brand-dark/90">
            Sua resposta ajuda a clínica a organizar os atendimentos.
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label={confirming ? "Confirmando..." : "Sim, vou comparecer"}
            variant="primary"
            loading={confirming}
            accessibilityLabel="Sim, vou comparecer"
            onPress={() => { void handleConfirmPresence(); }}
          />

          <Button
            label="Não consigo ir nesse horário"
            variant="outline"
            accessibilityLabel="Não consigo ir nesse horário"
            disabled={confirming}
            onPress={handleDeclinePresence}
          />
        </View>

        {confirmError ? (
          <Text accessibilityRole="alert" className="text-center text-sm font-medium text-danger">
            {confirmError}
          </Text>
        ) : null}

        {unavailableRegistered ? (
          <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-base font-bold text-ink">
              Indisponibilidade registrada
            </Text>
            <Text className="text-sm text-muted">
              Se desejar, reagende para outro dia ou cancele este agendamento.
            </Text>

            <View className="gap-2.5 pt-1">
              <Button
                label="Reagendar consulta"
                variant="primary"
                accessibilityLabel="Reagendar consulta"
                onPress={() => setRescheduleOpen(true)}
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

              <Button
                label="Voltar aos detalhes"
                variant="ghost"
                accessibilityLabel="Voltar aos detalhes da consulta"
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        ) : null}

        <Text className="px-2 text-center text-xs text-muted">
          Você poderá alterar essa resposta depois.
        </Text>
      </ScrollView>

      <RescheduleAppointmentModal
        appointment={rescheduleOpen ? appointment : null}
        onClose={() => setRescheduleOpen(false)}
        onRescheduled={() => {
          setRescheduleOpen(false);
          navigation.goBack();
        }}
      />

      <CancelAppointmentModal
        appointment={cancelOpen ? appointment : null}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          setCancelOpen(false);
          navigation.reset({
            index: 1,
            routes: [
              {
                name: "PatientTabs",
                params: { screen: "PatientConsultations" },
              },
              { name: "PatientAppointmentCanceled" },
            ],
          });
        }}
      />
    </View>
  );
}

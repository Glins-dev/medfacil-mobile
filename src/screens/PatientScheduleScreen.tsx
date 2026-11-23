import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import {
  Button,
  Modal,
  NoticeCard,
  PatientScreenHeader,
} from "@/components";
import { CalendarIcon } from "@/navigation/icons";
import {
  ScheduleStepIndicator,
  type ScheduleStepNumber,
} from "@/components/schedule/ScheduleStepIndicator";
import { SpecialtyDropdown } from "@/components/schedule/SpecialtyDropdown";
import { CLINIC_INFO } from "@/constants/clinic";
import type {
  PatientStackParamList,
  PatientTabParamList,
} from "@/navigation/types";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import {
  appointmentService,
  type Appointment,
} from "@/services/appointment.service";
import {
  catalogService,
  type DoctorWithAvailability,
  type Specialty,
} from "@/services/catalog.service";
import {
  findPatientAppointmentConflict,
  useAppointments,
  useAppointmentStore,
} from "@/stores/appointment.store";
import {
  describeDate,
  formatLongDate,
  formatTime,
  getPeriod,
  getUpcomingDates,
  type DayPeriod,
} from "@/utils/date";
import { getSpecialtyImage } from "@/utils/specialtyIcons";

type Props = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "PatientSchedule">,
  NativeStackScreenProps<PatientStackParamList>
>;
type LoadStatus = "loading" | "ready" | "error";

const DAYS_AHEAD = 14;
const PERIOD_ORDER: DayPeriod[] = ["Manhã", "Tarde", "Noite"];

// Carrega listas remotas ignorando respostas atrasadas quando a selecao muda.
function useRemoteList<T>(load: (() => Promise<T[]>) | null, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setItems([]);
    if (!load) {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    load()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { items, status, reload: () => setReloadKey((key) => key + 1) };
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function CheckIcon({ color = "#ffffff", size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between gap-4 py-3.5 ${isLast ? "" : "border-b border-line/60"
        }`}
    >
      <Text className="w-24 text-xs font-medium text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-bold text-ink">
        {value}
      </Text>
    </View>
  );
}

// Fluxo de agendamento em 3 etapas alinhado aos designs oficiais e regras reais de disponibilidade.
export function PatientScheduleScreen({ navigation }: Props) {
  const { appointments: patientAppointments, reload: reloadAppointments } =
    useAppointments();
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = 104 + insets.bottom;

  const [step, setStep] = useState<ScheduleStepNumber>(1);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [pickedDoctorId, setPickedDoctorId] = useState<string | null>(null);

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [conflictRequiresNewSlot, setConflictRequiresNewSlot] = useState(false);

  const upcomingDateStrings = useMemo(() => getUpcomingDates(DAYS_AHEAD), []);
  const todayDateKey = upcomingDateStrings[0] ?? "";
  const tomorrowDateKey = upcomingDateStrings[1] ?? "";

  const specialties = useRemoteList<Specialty>(
    () => catalogService.listSpecialties(),
    []
  );

  const doctors = useRemoteList<DoctorWithAvailability>(
    specialtyId
      ? () => catalogService.listAvailableDoctors(specialtyId, upcomingDateStrings)
      : null,
    [specialtyId, upcomingDateStrings]
  );

  const selectedSpecialty =
    specialties.items.find((item) => item.id === specialtyId) ?? null;

  // Agrega todas as datas com ao menos um horario livre entre os medicos da especialidade.
  const aggregatedDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const doctor of doctors.items) {
      for (const entry of doctor.availableDates) {
        if (entry.slots.length === 0) continue;
        const slotSet = map.get(entry.date) ?? new Set<string>();
        for (const slot of entry.slots) {
          slotSet.add(slot);
        }
        map.set(entry.date, slotSet);
      }
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, slotSet]) => ({
        date: dateKey,
        slots: [...slotSet].sort((a, b) => a.localeCompare(b)),
        ...describeDate(dateKey),
      }));
  }, [doctors.items]);

  const selectedDateEntry =
    aggregatedDates.find((item) => item.date === date) ?? null;

  // Garante que a data e o horario continuem validos caso a disponibilidade seja recarregada.
  useEffect(() => {
    if (date && !aggregatedDates.some((item) => item.date === date)) {
      setDate(null);
      setTime(null);
      setPickedDoctorId(null);
    }
  }, [aggregatedDates, date]);

  useEffect(() => {
    if (date && time && selectedDateEntry && !selectedDateEntry.slots.includes(time)) {
      setTime(null);
      setPickedDoctorId(null);
    }
  }, [date, selectedDateEntry, time]);

  // Agrupa horarios "HH:mm" da data escolhida por periodo no fuso America/Recife.
  const groupedSlots = useMemo(() => {
    if (!date || !selectedDateEntry) return [];
    const buckets: Record<DayPeriod, string[]> = {
      Manhã: [],
      Tarde: [],
      Noite: [],
    };
    for (const slot of selectedDateEntry.slots) {
      const period = getPeriod(`${date}T${slot}:00-03:00`);
      buckets[period].push(slot);
    }
    return PERIOD_ORDER.filter((period) => buckets[period].length > 0).map(
      (period) => ({
        period,
        items: buckets[period],
      })
    );
  }, [date, selectedDateEntry]);

  // Medicos da especialidade que possuem exatamente a data e horario selecionados livres.
  const availableDoctorsForSlot = useMemo(() => {
    if (!date || !time) return [];
    return doctors.items.filter((doctor) =>
      doctor.availableDates.some(
        (entry) => entry.date === date && entry.slots.includes(time)
      )
    );
  }, [date, doctors.items, time]);

  const resolvedDoctor = useMemo(() => {
    if (availableDoctorsForSlot.length === 0) return null;
    return (
      availableDoctorsForSlot.find((d) => d.id === pickedDoctorId) ??
      availableDoctorsForSlot[0]
    );
  }, [availableDoctorsForSlot, pickedDoctorId]);

  const conflictingSlotsInDay = useMemo(() => {
    if (!date || !selectedDateEntry) return [];
    return selectedDateEntry.slots
      .map((slot) => ({
        slot,
        conflict: findPatientAppointmentConflict(
          patientAppointments,
          date,
          slot
        ),
      }))
      .filter(
        (entry): entry is { slot: string; conflict: Appointment } =>
          entry.conflict !== null
      );
  }, [date, patientAppointments, selectedDateEntry]);

  const activeSelectionConflict = useMemo(() => {
    if (!date || !time) return null;
    return findPatientAppointmentConflict(patientAppointments, date, time);
  }, [date, patientAppointments, time]);

  const formatDayPrefix = useCallback(
    (dateKey: string): string => {
      if (dateKey === todayDateKey) return "Hoje · ";
      if (dateKey === tomorrowDateKey) return "Amanhã · ";
      return "";
    },
    [todayDateKey, tomorrowDateKey]
  );

  const handleBack = () => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (step > 1) {
      setStep((current) => (current - 1) as ScheduleStepNumber);
      return;
    }
    navigation.navigate("PatientHome");
  };

  const handleSelectSpecialty = (specialty: Specialty) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (specialty.id !== specialtyId) {
      setSpecialtyId(specialty.id);
      setDate(null);
      setTime(null);
      setPickedDoctorId(null);
    }
  };

  const handleSelectDate = (nextDate: string) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (nextDate !== date) {
      setDate(nextDate);
      setTime(null);
      setPickedDoctorId(null);
    }
    setDateModalOpen(false);
  };

  const handleSelectTime = (nextTime: string) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    setTime(nextTime);
    setPickedDoctorId(null);
    setTimeModalOpen(false);
  };

  const handleConfirm = async () => {
    if (!resolvedDoctor || !date || !time || submitting) return;

    const existingConflict = findPatientAppointmentConflict(
      patientAppointments,
      date,
      time
    );
    if (existingConflict) {
      setSubmitError("Você já possui uma consulta neste horário");
      setConflictRequiresNewSlot(true);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    try {
      const created = await appointmentService.book({
        doctorId: resolvedDoctor.id,
        date,
        time,
      });
      const store = useAppointmentStore.getState();
      if (store.status === "ready") {
        store.upsert(created);
      } else {
        void store.load({ force: true });
      }
      const summary = {
        appointmentId: created.id,
        specialty: created.specialty ?? selectedSpecialty?.name ?? null,
        doctorName: created.doctorName,
        doctorCrm: resolvedDoctor.crm,
        dateTime: created.dateTime,
      };
      handleResetFlow();
      navigation.navigate("PatientBookingConfirmed", summary);
    } catch (error) {
      const status = getApiErrorStatus(error);
      setSubmitError(
        getApiErrorMessage(
          error,
          "Não foi possível agendar a consulta. Tente novamente."
        )
      );
      if (status === 409) {
        setTime(null);
        setPickedDoctorId(null);
        setConflictRequiresNewSlot(true);
        doctors.reload();
        void reloadAppointments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setSpecialtyId(null);
    setDate(null);
    setTime(null);
    setPickedDoctorId(null);
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    setStep(1);
  };

  const selectedPeriod =
    date && time ? getPeriod(`${date}T${time}:00-03:00`) : null;

  const specialtyImage = getSpecialtyImage(selectedSpecialty?.name);

  return (
    <View className="flex-1 bg-white">
      <PatientScreenHeader
        title="Agenda"
        subtitle="Escolha a especialidade e o horário."
        onBackPress={handleBack}
        backAccessibilityLabel={
          step === 1 ? "Voltar para início" : "Voltar para etapa anterior"
        }
        icon={<CalendarIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        contentContainerClassName="flex-grow gap-5 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        keyboardShouldPersistTaps="handled"
      >
        <>
          {step === 1 ? (
            <View className="flex-1 gap-5">
              <View className="gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-3xl font-bold leading-tight text-ink"
                >
                  Escolha a especialidade
                </Text>
                <ScheduleStepIndicator currentStep={1} />
              </View>

              <Text className="text-base font-bold text-ink">
                Qual especialidade você procura?
              </Text>

              <SpecialtyDropdown
                specialties={specialties.items}
                selectedSpecialty={selectedSpecialty}
                loading={specialties.status === "loading"}
                error={specialties.status === "error"}
                onRetry={specialties.reload}
                onSelect={handleSelectSpecialty}
              />

              {selectedSpecialty ? (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-muted">
                    Sua escolha
                  </Text>

                  <View className="flex-row items-center gap-4 rounded-3xl border-2 border-accent bg-surface p-4">
                    <Image
                      source={specialtyImage}
                      resizeMode="contain"
                      className="h-16 w-16 shrink-0"
                    />

                    <View className="min-w-0 flex-1 items-start gap-1">
                      <Text className="text-lg font-bold text-ink">
                        {selectedSpecialty.name}
                      </Text>
                      {selectedSpecialty.description ? (
                        <Text className="text-sm text-muted">
                          {selectedSpecialty.description}
                        </Text>
                      ) : null}

                      <View className="mt-1.5 flex-row items-center gap-1.5 rounded-full bg-brand-light px-3 py-1">
                        <CheckIcon color="#ffffff" size={13} />
                        <Text className="text-xs font-bold text-white">
                          Escolhida
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className="mt-1 text-xs text-muted">
                    Você poderá alterar esta escolha antes de confirmar.
                  </Text>
                </View>
              ) : null}

              <View className="mt-auto pt-4">
                <Button
                  label="Continuar"
                  disabled={!specialtyId}
                  onPress={() => setStep(2)}
                />
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View className="flex-1 gap-5">
              <View className="gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-3xl font-bold leading-tight text-ink"
                >
                  Escolha data e horário
                </Text>
                <ScheduleStepIndicator currentStep={2} />
              </View>

              <Text className="text-sm leading-relaxed text-muted">
                Selecione a data e o horário. O profissional e a unidade
                aparecem abaixo.
              </Text>

              {doctors.status === "loading" ? (
                <View className="min-h-[140px] items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-6">
                  <ActivityIndicator size="small" color="#0e706f" />
                  <Text className="text-sm text-muted">
                    Buscando datas e profissionais com horários livres...
                  </Text>
                </View>
              ) : null}

              {doctors.status === "error" ? (
                <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
                  <Text className="text-sm font-medium text-ink">
                    Não foi possível carregar os horários disponíveis.
                  </Text>
                  <Button
                    label="Tentar novamente"
                    variant="outline"
                    onPress={doctors.reload}
                  />
                </View>
              ) : null}

              {doctors.status === "ready" && aggregatedDates.length === 0 ? (
                <View className="gap-3">
                  <NoticeCard
                    title="Nenhum médico com agenda livre"
                    subtitle="Os profissionais desta especialidade não possuem horários disponíveis nos próximos 14 dias."
                    detail="Toque para escolher outra especialidade"
                    onPress={() => setStep(1)}
                  />
                  <Button
                    label="Alterar especialidade"
                    variant="outline"
                    onPress={() => setStep(1)}
                  />
                </View>
              ) : null}

              {doctors.status === "ready" && aggregatedDates.length > 0 ? (
                <View className="gap-3">
                  <Pressable
                    onPress={() => setDateModalOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedDateEntry
                        ? `Data selecionada: ${formatDayPrefix(
                          selectedDateEntry.date
                        )}${selectedDateEntry.weekdayLong}, ${selectedDateEntry.dayMonth}. Toque para alterar`
                        : "Selecionar data"
                    }
                    className="min-h-[64px] flex-row items-center justify-between gap-3 rounded-2xl border-2 border-brand bg-white px-4 py-2.5 active:opacity-85"
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-medium text-muted">
                        Data
                      </Text>
                      <Text
                        numberOfLines={1}
                        className={`mt-0.5 text-lg font-bold ${selectedDateEntry ? "text-ink" : "text-muted"
                          }`}
                      >
                        {selectedDateEntry
                          ? `${formatDayPrefix(selectedDateEntry.date)}${selectedDateEntry.weekdayLong
                          }, ${selectedDateEntry.dayMonth}`
                          : "Selecione uma data"}
                      </Text>
                    </View>
                    <ChevronDownIcon color="#0e706f" />
                  </Pressable>

                  <Pressable
                    onPress={() => setTimeModalOpen(true)}
                    disabled={!date}
                    accessibilityRole="button"
                    accessibilityLabel={
                      time && selectedPeriod
                        ? `Horário selecionado: ${time}, ${selectedPeriod}. Toque para alterar`
                        : "Selecionar horário"
                    }
                    accessibilityState={{ disabled: !date }}
                    className={`min-h-[64px] flex-row items-center justify-between gap-3 rounded-2xl border-2 bg-white px-4 py-2.5 active:opacity-85 ${date ? "border-brand" : "border-line opacity-60"
                      }`}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-medium text-muted">
                        Horário
                      </Text>
                      <Text
                        numberOfLines={1}
                        className={`mt-0.5 text-lg font-bold ${time ? "text-ink" : "text-muted"
                          }`}
                      >
                        {time && selectedPeriod
                          ? `${time} · ${selectedPeriod}`
                          : date
                            ? "Selecione um horário"
                            : "Escolha uma data primeiro"}
                      </Text>
                    </View>
                    <ChevronDownIcon color={date ? "#0e706f" : "#5f6b6f"} />
                  </Pressable>

                  {date && conflictingSlotsInDay.length > 0 ? (
                    <View
                      accessibilityRole="alert"
                      className="rounded-2xl border border-danger/30 bg-danger/10 p-4"
                    >
                      <Text className="text-sm font-bold text-danger">
                        Você já possui uma consulta neste horário
                      </Text>
                      <Text className="mt-1 text-xs text-ink">
                        Horários bloqueados na sua agenda neste dia:{" "}
                        {conflictingSlotsInDay
                          .map((entry) => entry.slot)
                          .join(", ")}
                        .
                      </Text>
                    </View>
                  ) : null}

                  {activeSelectionConflict ? (
                    <View
                      accessibilityRole="alert"
                      className="rounded-2xl border border-danger/30 bg-danger/10 p-4"
                    >
                      <Text className="text-sm font-bold text-danger">
                        Você já possui uma consulta neste horário
                      </Text>
                    </View>
                  ) : null}

                  {resolvedDoctor && date && time ? (
                    <View className="gap-2 pt-1">
                      <Text className="text-sm font-medium text-muted">
                        Profissional e unidade
                      </Text>

                      <View className="gap-3 rounded-3xl border-2 border-accent bg-surface p-4">
                        <View className="flex-row items-center gap-4">
                          <Image
                            source={specialtyImage}
                            resizeMode="contain"
                            className="h-16 w-16 shrink-0"
                          />

                          <View className="min-w-0 flex-1 gap-1">
                            <Text
                              numberOfLines={1}
                              className="text-lg font-bold text-ink"
                            >
                              {resolvedDoctor.name}
                            </Text>
                            <Text className="text-xs font-medium text-muted">
                              {CLINIC_INFO.name} · CRM {resolvedDoctor.crm}
                            </Text>

                            <View className="mt-1 flex-row items-center gap-2.5">
                              <View className="flex-row items-center gap-1 rounded-full bg-brand-light px-3 py-1">
                                <CheckIcon color="#ffffff" size={13} />
                                <Text className="text-xs font-bold text-white">
                                  Disponível
                                </Text>
                              </View>
                              <Text className="text-xs font-medium text-muted">
                                {CLINIC_INFO.neighborhood}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {availableDoctorsForSlot.length > 1 ? (
                          <Button
                            label={`Trocar profissional (${availableDoctorsForSlot.length} disponíveis)`}
                            variant="outline"
                            onPress={() => setDoctorModalOpen(true)}
                          />
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View className="mt-auto pt-4">
                <Button
                  label="Continuar"
                  disabled={
                    !date ||
                    !time ||
                    !resolvedDoctor ||
                    Boolean(activeSelectionConflict)
                  }
                  onPress={() => setStep(3)}
                />
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="flex-1 gap-5">
              <View className="gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-3xl font-bold leading-tight text-ink"
                >
                  Revise seu agendamento
                </Text>
                <ScheduleStepIndicator currentStep={3} />
              </View>

              <Text className="text-sm text-muted">
                Confira os dados antes de confirmar.
              </Text>

              <LinearGradient
                colors={["#dff3f4", "#fef7e5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.8 }}
                style={{
                  borderRadius: 24,
                  padding: 20,
                  overflow: "hidden",
                }}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 items-start gap-1">
                    <Text className="text-2xl font-bold text-ink">
                      {selectedSpecialty?.name}
                    </Text>
                    <Text className="text-sm font-medium text-muted">
                      {resolvedDoctor?.name}
                    </Text>

                    <View className="mt-3 rounded-full bg-brand-light/20 px-4 py-1.5">
                      <Text className="text-xs font-bold text-brand-dark">
                        Selecionado
                      </Text>
                    </View>
                  </View>

                  <Image
                    source={specialtyImage}
                    resizeMode="contain"
                    className="h-24 w-24 shrink-0"
                  />
                </View>
              </LinearGradient>

              <View className="rounded-3xl border border-line bg-white px-5 py-1">
                <DetailRow
                  label="Data"
                  value={
                    date
                      ? `${formatLongDate(`${date}T12:00:00.000Z`)} (${selectedDateEntry?.weekdayLong ?? ""
                      })`
                      : ""
                  }
                />
                <DetailRow label="Horário" value={time ?? ""} />
                <DetailRow label="Local" value={CLINIC_INFO.name} />
                <DetailRow label="Endereço" value={CLINIC_INFO.address} />
                <DetailRow
                  label="Período"
                  value={selectedPeriod ?? ""}
                  isLast
                />
              </View>

              {activeSelectionConflict ? (
                <View
                  accessibilityRole="alert"
                  className="gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4"
                >
                  <Text className="text-center text-sm font-bold text-danger">
                    Você já possui uma consulta neste horário
                  </Text>
                  <Button
                    label="Escolher outro horário"
                    variant="outline"
                    onPress={() => setStep(2)}
                  />
                </View>
              ) : null}

              {submitError ? (
                <View className="gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4">
                  <Text
                    accessibilityRole="alert"
                    className="text-center text-sm font-medium text-danger"
                  >
                    {submitError}
                  </Text>
                  {conflictRequiresNewSlot ? (
                    <Button
                      label="Escolher outro horário"
                      variant="outline"
                      onPress={() => setStep(2)}
                    />
                  ) : null}
                </View>
              ) : null}

              <View className="mt-auto gap-2 pt-2">
                <Button
                  label={
                    submitting ? "Confirmando..." : "Confirmar consulta"
                  }
                  disabled={
                    !resolvedDoctor ||
                    !date ||
                    !time ||
                    Boolean(activeSelectionConflict)
                  }
                  loading={submitting}
                  onPress={() => {
                    void handleConfirm();
                  }}
                />
                <Text className="text-center text-xs text-muted">
                  Você poderá cancelar ou remarcar depois.
                </Text>
              </View>
            </View>
          ) : null}
        </>
      </ScrollView>

      <Modal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        title="Dias com horários livres"
        closeLabel="Fechar lista de datas"
      >
        <ScrollView
          className="max-h-[420px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2.5 pb-2"
        >
          {aggregatedDates.map((item) => {
            const selected = item.date === date;
            const slotsCount = item.slots.length;
            return (
              <Pressable
                key={item.date}
                onPress={() => handleSelectDate(item.date)}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayPrefix(item.date)}${item.weekdayLong}, ${item.dayMonth}. ${slotsCount} ${slotsCount === 1 ? "horário disponível" : "horários disponíveis"}`}
                accessibilityState={{ selected }}
                className={`min-h-[64px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${selected
                    ? "border-brand bg-brand"
                    : "border-line bg-white"
                  }`}
              >
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className={`text-xs font-semibold ${selected ? "text-white/90" : "text-muted"
                      }`}
                  >
                    {formatDayPrefix(item.date)}
                    {item.weekdayLong}
                  </Text>
                  <Text
                    className={`text-base font-bold ${selected ? "text-white" : "text-ink"
                      }`}
                  >
                    {item.dayMonth}
                  </Text>
                </View>

                <View
                  className={`rounded-full px-3 py-1.5 ${selected ? "bg-white/20" : "bg-brand/10"
                    }`}
                >
                  <Text
                    className={`text-xs font-bold ${selected ? "text-white" : "text-brand-dark"
                      }`}
                  >
                    {slotsCount} {slotsCount === 1 ? "horário" : "horários"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>

      <Modal
        open={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        title="Escolha o horário"
        closeLabel="Fechar lista de horários"
      >
        <ScrollView
          className="max-h-[440px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          {selectedDateEntry ? (
            <View className="rounded-xl border border-line bg-surface px-4 py-2.5">
              <Text className="text-xs font-semibold text-muted">
                {formatDayPrefix(selectedDateEntry.date)}
                {selectedDateEntry.weekdayLong}
              </Text>
              <Text className="text-base font-bold text-brand-dark">
                {selectedDateEntry.dayMonth}
              </Text>
            </View>
          ) : null}

          {date && conflictingSlotsInDay.length > 0 ? (
            <View
              accessibilityRole="alert"
              className="rounded-xl border border-danger/30 bg-danger/10 p-3"
            >
              <Text className="text-xs font-bold text-danger">
                Você já possui uma consulta neste horário:{" "}
                {conflictingSlotsInDay.map((entry) => entry.slot).join(", ")}.
              </Text>
            </View>
          ) : null}

          {date && groupedSlots.length > 0
            ? groupedSlots.map((group) => (
              <View key={group.period} className="gap-2">
                <Text className="text-sm font-bold text-brand-dark">
                  {group.period}
                </Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {group.items.map((slot) => {
                    const conflict = findPatientAppointmentConflict(
                      patientAppointments,
                      date,
                      slot
                    );
                    const isConflict = Boolean(conflict);
                    const selected = !isConflict && slot === time;

                    return (
                      <Pressable
                        key={slot}
                        disabled={isConflict}
                        onPress={() => handleSelectTime(slot)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isConflict
                            ? `${slot}, indisponível. Você já possui uma consulta neste horário`
                            : `${slot}, ${group.period}`
                        }
                        accessibilityState={{
                          selected,
                          disabled: isConflict,
                        }}
                        className={`min-h-[48px] min-w-[96px] items-center justify-center rounded-xl border-2 px-4 py-2 active:opacity-85 ${isConflict
                            ? "border-danger/35 bg-danger/10 opacity-75"
                            : selected
                              ? "border-brand bg-brand"
                              : "border-line bg-white"
                          }`}
                      >
                        <Text
                          className={`text-sm font-bold ${isConflict
                              ? "text-danger line-through"
                              : selected
                                ? "text-white"
                                : "text-ink"
                            }`}
                        >
                          {slot}
                        </Text>
                        {isConflict ? (
                          <Text className="text-[11px] font-semibold text-danger">
                            Você já tem consulta
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
            : null}
        </ScrollView>
      </Modal>

      <Modal
        open={doctorModalOpen}
        onClose={() => setDoctorModalOpen(false)}
        title="Escolher profissional"
        closeLabel="Fechar lista de profissionais"
      >
        <ScrollView
          className="max-h-[380px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2.5 pb-2"
        >
          {availableDoctorsForSlot.map((doctor) => {
            const selected = doctor.id === resolvedDoctor?.id;
            return (
              <Pressable
                key={doctor.id}
                onPress={() => {
                  setPickedDoctorId(doctor.id);
                  setDoctorModalOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${doctor.name}, CRM ${doctor.crm}`}
                accessibilityState={{ selected }}
                className={`min-h-[56px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${selected
                    ? "border-brand bg-brand/10"
                    : "border-line bg-white"
                  }`}
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-bold text-ink">
                    {doctor.name}
                  </Text>
                  <Text className="text-xs text-muted">
                    {CLINIC_INFO.name} · CRM {doctor.crm}
                  </Text>
                </View>
                {selected ? <CheckIcon color="#0e706f" size={18} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </View>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";

import { Button, NoticeCard } from "@/components";
import {
  ScheduleStepIndicator,
  type ScheduleStepNumber,
} from "@/components/schedule/ScheduleStepIndicator";
import { SpecialtyDropdown } from "@/components/schedule/SpecialtyDropdown";
import type { PatientTabParamList } from "@/navigation/types";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import {
  appointmentService,
  type Appointment,
} from "@/services/appointment.service";
import {
  catalogService,
  type AvailableDateSlots,
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
  formatDayMonth,
  formatTime,
  formatWeekdayLong,
  getClinicDateKey,
  getPeriod,
  getUpcomingDates,
  type DayPeriod,
} from "@/utils/date";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientSchedule">;
type LoadStatus = "loading" | "ready" | "error";

const DAYS_AHEAD = 14;
const PERIOD_ORDER: DayPeriod[] = ["Manhã", "Tarde", "Noite"];

// Carrega listas remotas ignorando respostas atrasadas quando filtros mudam.
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

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function ArrowLeftIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function SuccessBadgeIcon() {
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-line/70 py-3">
      <Text className="w-28 text-xs font-semibold uppercase text-muted">
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-bold text-ink">
        {value}
      </Text>
    </View>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View className="min-h-[140px] items-center justify-center gap-3 rounded-2xl border border-line bg-white p-6">
      <ActivityIndicator size="small" color="#0e706f" />
      <Text className="text-sm text-muted">{message}</Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="gap-4 rounded-2xl border border-line bg-white p-5">
      <Text className="text-sm font-medium text-ink">{message}</Text>
      <Button label="Tentar novamente" variant="outline" onPress={onRetry} />
    </View>
  );
}

// Fluxo progressivo em 4 etapas com filtros reais de disponibilidade e conflito.
export function PatientScheduleScreen({ navigation }: Props) {
  const { appointments: patientAppointments, reload: reloadAppointments } =
    useAppointments();

  const [step, setStep] = useState<ScheduleStepNumber>(1);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [doctorAvailableDates, setDoctorAvailableDates] = useState<
    AvailableDateSlots[]
  >([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesError, setDatesError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [conflictRequiresNewSlot, setConflictRequiresNewSlot] = useState(false);
  const [createdAppointment, setCreatedAppointment] =
    useState<Appointment | null>(null);

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
  const selectedDoctor =
    doctors.items.find((item) => item.id === doctorId) ?? null;

  const availableDatesView = useMemo(
    () =>
      doctorAvailableDates
        .filter((item) => item.slots.length > 0)
        .map((item) => ({
          ...item,
          ...describeDate(item.date),
        })),
    [doctorAvailableDates]
  );

  const selectedDateEntry =
    availableDatesView.find((item) => item.date === date) ?? null;

  // Garante que a data selecionada continue existindo apos atualizacoes de disponibilidade.
  useEffect(() => {
    if (date && !availableDatesView.some((item) => item.date === date)) {
      setDate(null);
      setTime(null);
    }
  }, [availableDatesView, date]);

  const reloadDoctorDates = useCallback(async () => {
    if (!doctorId) return;
    setDatesLoading(true);
    setDatesError(false);
    try {
      const freshDates = await catalogService.listAvailableDates(
        doctorId,
        upcomingDateStrings
      );
      setDoctorAvailableDates(freshDates);
    } catch {
      setDatesError(true);
    } finally {
      setDatesLoading(false);
    }
  }, [doctorId, upcomingDateStrings]);

  // Agrupa horarios "HH:mm" do dia escolhido por periodo no fuso America/Recife.
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

  // Identifica horarios do dia selecionado que conflitam com consultas ativas do paciente.
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

  const handleBack = () => {
    if (createdAppointment) {
      navigation.navigate("PatientHome");
      return;
    }
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
      setDoctorId(null);
      setDoctorAvailableDates([]);
      setDate(null);
      setTime(null);
    }
  };

  const handleSelectDoctor = (doctor: DoctorWithAvailability) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    setDatesError(false);
    if (doctor.id !== doctorId) {
      setDoctorId(doctor.id);
      setDoctorAvailableDates(doctor.availableDates);
      setDate(null);
      setTime(null);
    }
    setStep(3);
  };

  const handleSelectDate = (value: string) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (value !== date) {
      setDate(value);
      setTime(null);
    }
  };

  const handleConfirm = async () => {
    if (!doctorId || !date || !time || submitting) return;

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
      const created = await appointmentService.book({ doctorId, date, time });
      const store = useAppointmentStore.getState();
      if (store.status === "ready") {
        store.upsert(created);
      } else {
        void store.load({ force: true });
      }
      setCreatedAppointment(created);
    } catch (error) {
      const status = getApiErrorStatus(error);
      const fallbackMessage =
        "Não foi possível agendar a consulta. Tente novamente.";
      setSubmitError(getApiErrorMessage(error, fallbackMessage));

      if (status === 409) {
        setTime(null);
        setConflictRequiresNewSlot(true);
        void reloadDoctorDates();
        void reloadAppointments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setCreatedAppointment(null);
    setSpecialtyId(null);
    setDoctorId(null);
    setDoctorAvailableDates([]);
    setDate(null);
    setTime(null);
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    setStep(1);
  };

  const selectedPeriod =
    date && time ? getPeriod(`${date}T${time}:00-03:00`) : null;

  const formatDayPrefix = (dateKey: string): string => {
    if (dateKey === todayDateKey) return "Hoje · ";
    if (dateKey === tomorrowDateKey) return "Amanhã · ";
    return "";
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-brand-cream"
    >
      <ScrollView
        contentContainerClassName="flex-grow gap-5 px-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={
              createdAppointment
                ? "Voltar para o início"
                : step > 1
                  ? "Voltar para etapa anterior"
                  : "Voltar para o início"
            }
            className="min-h-[48px] flex-row items-center gap-1.5 rounded-xl px-2 active:opacity-70"
          >
            <ArrowLeftIcon />
            <Text className="text-sm font-semibold text-brand">
              {createdAppointment
                ? "Início"
                : step > 1
                  ? "Etapa anterior"
                  : "Início"}
            </Text>
          </Pressable>

          <Text className="text-lg font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>
        </View>

        {createdAppointment ? (
          <View className="gap-5">
            <View className="items-center gap-3 rounded-3xl border border-line bg-white p-6">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                <SuccessBadgeIcon />
              </View>
              <Text
                accessibilityRole="header"
                className="text-center text-2xl font-bold text-brand-dark"
              >
                Consulta agendada
              </Text>
              <Text className="text-center text-sm text-muted">
                Seu horário foi reservado com sucesso.
              </Text>
            </View>

            <View className="rounded-2xl border border-line bg-white px-4 py-1">
              <SummaryRow
                label="Especialidade"
                value={
                  createdAppointment.specialty ??
                  selectedSpecialty?.name ??
                  "Consulta"
                }
              />
              <SummaryRow
                label="Médico"
                value={createdAppointment.doctorName}
              />
              <SummaryRow
                label="Data"
                value={`${formatWeekdayLong(
                  createdAppointment.dateTime
                )}, ${formatDayMonth(createdAppointment.dateTime)}`}
              />
              <View className="flex-row items-center justify-between gap-3 py-3">
                <Text className="w-28 text-xs font-semibold uppercase text-muted">
                  Horário
                </Text>
                <Text className="flex-1 text-right text-sm font-bold text-ink">
                  {formatTime(createdAppointment.dateTime)} (
                  {getPeriod(createdAppointment.dateTime)})
                </Text>
              </View>
            </View>

            <View className="gap-3 pt-2">
              <Button
                label="Ver minhas consultas"
                onPress={() => navigation.navigate("PatientConsultations")}
              />
              <Button
                label="Agendar outra consulta"
                variant="outline"
                onPress={handleResetFlow}
              />
            </View>
          </View>
        ) : (
          <>
            <View>
              <Text
                accessibilityRole="header"
                className="text-3xl font-bold text-ink"
              >
                Marcar consulta
              </Text>
              <Text className="mt-1 text-base text-muted">
                Siga as etapas abaixo para escolher seu horário.
              </Text>
            </View>

            <ScheduleStepIndicator currentStep={step} />

            {step === 1 ? (
              <View className="gap-4">
                <Text className="text-lg font-bold text-ink">
                  Escolha a especialidade
                </Text>

                <SpecialtyDropdown
                  specialties={specialties.items}
                  selectedSpecialty={selectedSpecialty}
                  loading={specialties.status === "loading"}
                  error={specialties.status === "error"}
                  onRetry={specialties.reload}
                  onSelect={handleSelectSpecialty}
                />

                <Button
                  label="Continuar"
                  disabled={!specialtyId}
                  onPress={() => setStep(2)}
                />
              </View>
            ) : null}

            {step === 2 ? (
              <View className="gap-4">
                <View className="rounded-xl border border-brand/25 bg-white px-4 py-3">
                  <Text className="text-xs font-semibold uppercase text-muted">
                    Especialidade selecionada
                  </Text>
                  <Text className="mt-0.5 text-base font-bold text-brand-dark">
                    {selectedSpecialty?.name}
                  </Text>
                </View>

                <Text className="text-lg font-bold text-ink">
                  Escolha o profissional
                </Text>

                {doctors.status === "loading" ? (
                  <LoadingState message="Verificando médicos com horários disponíveis..." />
                ) : null}

                {doctors.status === "error" ? (
                  <ErrorState
                    message="Não foi possível carregar os profissionais disponíveis."
                    onRetry={doctors.reload}
                  />
                ) : null}

                {doctors.status === "ready" && doctors.items.length === 0 ? (
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

                {doctors.status === "ready" && doctors.items.length > 0 ? (
                  <View className="gap-3">
                    {doctors.items.map((doctor) => {
                      const selected = doctor.id === doctorId;
                      const daysCount = doctor.availableDates.length;
                      return (
                        <Pressable
                          key={doctor.id}
                          onPress={() => handleSelectDoctor(doctor)}
                          accessibilityRole="button"
                          accessibilityLabel={`${doctor.name}, CRM ${doctor.crm}, ${daysCount} ${daysCount === 1 ? "dia disponível" : "dias disponíveis"}`}
                          accessibilityState={{ selected }}
                          className={`min-h-[68px] flex-row items-center gap-3 rounded-2xl border-2 p-4 active:opacity-85 ${
                            selected
                              ? "border-brand bg-brand/10"
                              : "border-line bg-white"
                          }`}
                        >
                          <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-dark">
                            <Text className="text-sm font-bold text-white">
                              {getInitials(doctor.name)}
                            </Text>
                          </View>

                          <View className="min-w-0 flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-base font-bold text-ink"
                            >
                              {doctor.name}
                            </Text>
                            <Text className="mt-0.5 text-xs font-semibold text-muted">
                              CRM {doctor.crm}
                            </Text>
                            <Text className="mt-0.5 text-xs font-semibold text-brand">
                              {daysCount}{" "}
                              {daysCount === 1
                                ? "dia disponível"
                                : "dias disponíveis"}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {doctorId ? (
                  <Button label="Continuar" onPress={() => setStep(3)} />
                ) : null}
              </View>
            ) : null}

            {step === 3 ? (
              <View className="gap-5">
                <View className="rounded-xl border border-brand/25 bg-white px-4 py-3">
                  <Text className="text-xs font-semibold uppercase text-muted">
                    Profissional selecionado
                  </Text>
                  <Text className="mt-0.5 text-base font-bold text-brand-dark">
                    {selectedDoctor?.name}
                  </Text>
                  {selectedDoctor ? (
                    <Text className="text-xs font-medium text-muted">
                      {selectedSpecialty?.name} · CRM {selectedDoctor.crm}
                    </Text>
                  ) : null}
                </View>

                <View className="gap-3">
                  <Text className="text-lg font-bold text-ink">
                    Dias com horários livres
                  </Text>

                  {datesLoading ? (
                    <LoadingState message="Atualizando datas disponíveis..." />
                  ) : null}

                  {!datesLoading && datesError ? (
                    <ErrorState
                      message="Não foi possível atualizar os dias disponíveis."
                      onRetry={() => {
                        void reloadDoctorDates();
                      }}
                    />
                  ) : null}

                  {!datesLoading &&
                  !datesError &&
                  availableDatesView.length === 0 ? (
                    <View className="gap-3">
                      <NoticeCard
                        title="Sem datas disponíveis"
                        subtitle="Este profissional não possui mais horários livres nos próximos dias."
                        detail="Toque para escolher outro médico"
                        onPress={() => setStep(2)}
                      />
                      <Button
                        label="Escolher outro médico"
                        variant="outline"
                        onPress={() => setStep(2)}
                      />
                    </View>
                  ) : null}

                  {!datesLoading &&
                  !datesError &&
                  availableDatesView.length > 0 ? (
                    <View className="gap-2.5">
                      {availableDatesView.map((item) => {
                        const selected = item.date === date;
                        const slotsCount = item.slots.length;
                        return (
                          <Pressable
                            key={item.date}
                            onPress={() => handleSelectDate(item.date)}
                            accessibilityRole="button"
                            accessibilityLabel={`${formatDayPrefix(item.date)}${item.weekdayLong}, ${item.dayMonth}. ${slotsCount} ${slotsCount === 1 ? "horário disponível" : "horários disponíveis"}`}
                            accessibilityState={{ selected }}
                            className={`min-h-[64px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${
                              selected
                                ? "border-brand bg-brand"
                                : "border-line bg-white"
                            }`}
                          >
                            <View className="min-w-0 flex-1 gap-0.5">
                              <Text
                                className={`text-xs font-semibold ${
                                  selected ? "text-white/90" : "text-muted"
                                }`}
                              >
                                {formatDayPrefix(item.date)}
                                {item.weekdayLong}
                              </Text>
                              <Text
                                className={`text-base font-bold ${
                                  selected ? "text-white" : "text-ink"
                                }`}
                              >
                                {item.dayMonth}
                              </Text>
                            </View>

                            <View
                              className={`rounded-full px-3 py-1.5 ${
                                selected ? "bg-white/20" : "bg-brand/10"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold ${
                                  selected ? "text-white" : "text-brand-dark"
                                }`}
                              >
                                {slotsCount}{" "}
                                {slotsCount === 1 ? "horário" : "horários"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <View className="gap-3">
                  <Text className="text-lg font-bold text-ink">
                    Horários disponíveis
                  </Text>

                  {!date ? (
                    <View className="rounded-2xl border border-dashed border-line bg-white p-5">
                      <Text className="text-sm text-muted">
                        Selecione um dia disponível acima para visualizar os
                        horários livres por período.
                      </Text>
                    </View>
                  ) : null}

                  {date && conflictingSlotsInDay.length > 0 ? (
                    <View
                      accessibilityRole="alert"
                      className="rounded-2xl border border-danger/30 bg-danger/10 p-4"
                    >
                      <Text className="text-sm font-bold text-danger">
                        Você já possui uma consulta neste horário
                      </Text>
                      <Text className="mt-1 text-xs text-ink">
                        Horários já ocupados na sua agenda neste dia:{" "}
                        {conflictingSlotsInDay
                          .map((entry) => entry.slot)
                          .join(", ")}
                        . Selecione outro horário livre.
                      </Text>
                    </View>
                  ) : null}

                  {date && groupedSlots.length > 0 ? (
                    <View className="gap-4">
                      {groupedSlots.map((group) => (
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
                                  onPress={() => {
                                    setTime(slot);
                                    setSubmitError("");
                                    setConflictRequiresNewSlot(false);
                                  }}
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
                                  className={`min-h-[48px] min-w-[96px] items-center justify-center rounded-xl border-2 px-4 py-2 active:opacity-85 ${
                                    isConflict
                                      ? "border-danger/35 bg-danger/10 opacity-75"
                                      : selected
                                        ? "border-brand bg-brand"
                                        : "border-line bg-white"
                                  }`}
                                >
                                  <Text
                                    className={`text-sm font-bold ${
                                      isConflict
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
                      ))}
                    </View>
                  ) : null}
                </View>

                <Button
                  label="Continuar para resumo"
                  disabled={!date || !time || Boolean(activeSelectionConflict)}
                  onPress={() => setStep(4)}
                />
              </View>
            ) : null}

            {step === 4 ? (
              <View className="gap-5">
                <Text className="text-lg font-bold text-ink">
                  Confirme os dados da consulta
                </Text>

                <View className="rounded-2xl border border-line bg-white px-4 py-1">
                  <SummaryRow
                    label="Especialidade"
                    value={selectedSpecialty?.name ?? ""}
                  />
                  <SummaryRow
                    label="Médico"
                    value={
                      selectedDoctor
                        ? `${selectedDoctor.name} (CRM ${selectedDoctor.crm})`
                        : ""
                    }
                  />
                  <SummaryRow
                    label="Data"
                    value={
                      selectedDateEntry
                        ? `${selectedDateEntry.weekdayLong}, ${selectedDateEntry.dayMonth}`
                        : ""
                    }
                  />
                  <View className="flex-row items-center justify-between gap-3 py-3">
                    <Text className="w-28 text-xs font-semibold uppercase text-muted">
                      Horário
                    </Text>
                    <Text className="flex-1 text-right text-sm font-bold text-ink">
                      {time && selectedPeriod
                        ? `${time} (${selectedPeriod})`
                        : ""}
                    </Text>
                  </View>
                </View>

                {activeSelectionConflict ? (
                  <View
                    accessibilityRole="alert"
                    className="gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4"
                  >
                    <Text className="text-center text-sm font-bold text-danger">
                      Você já possui uma consulta neste horário
                    </Text>
                    <Button
                      label="Escolher outro horário"
                      variant="outline"
                      onPress={() => setStep(3)}
                    />
                  </View>
                ) : null}

                {submitError ? (
                  <View className="gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
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
                        onPress={() => setStep(3)}
                      />
                    ) : null}
                  </View>
                ) : null}

                <View className="gap-3 pt-1">
                  <Button
                    label={
                      submitting ? "Agendando..." : "Confirmar agendamento"
                    }
                    disabled={
                      !doctorId ||
                      !date ||
                      !time ||
                      Boolean(activeSelectionConflict)
                    }
                    loading={submitting}
                    onPress={() => {
                      void handleConfirm();
                    }}
                  />
                  <Button
                    label="Alterar data ou horário"
                    variant="outline"
                    disabled={submitting}
                    onPress={() => setStep(3)}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

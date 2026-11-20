import { useEffect, useMemo, useState } from "react";
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

import { Button } from "@/components";
import {
  ScheduleStepIndicator,
  type ScheduleStepNumber,
} from "@/components/schedule/ScheduleStepIndicator";
import type { PatientTabParamList } from "@/navigation/types";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import {
  appointmentService,
  type Appointment,
} from "@/services/appointment.service";
import {
  catalogService,
  type Doctor,
  type Specialty,
} from "@/services/catalog.service";
import { useAppointmentStore } from "@/stores/appointment.store";
import {
  describeDate,
  formatLongDate,
  formatTime,
  getPeriod,
  getUpcomingDates,
  type DayPeriod,
} from "@/utils/date";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientSchedule">;
type LoadStatus = "loading" | "ready" | "error";

const DAYS_AHEAD = 14;
const PERIOD_ORDER: DayPeriod[] = ["Manhã", "Tarde", "Noite"];

// Carrega listas remotas de especialidades, medicos e horarios ignorando respostas atrasadas.
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

// Fluxo progressivo em 4 etapas: Especialidade, Medico, Data/Horario e Confirmacao.
export function PatientScheduleScreen({ navigation }: Props) {
  const [step, setStep] = useState<ScheduleStepNumber>(1);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [conflictRequiresNewSlot, setConflictRequiresNewSlot] = useState(false);
  const [createdAppointment, setCreatedAppointment] =
    useState<Appointment | null>(null);

  const dates = useMemo(
    () =>
      getUpcomingDates(DAYS_AHEAD).map((value) => ({
        value,
        ...describeDate(value),
      })),
    []
  );

  const specialties = useRemoteList<Specialty>(
    () => catalogService.listSpecialties(),
    []
  );
  const doctors = useRemoteList<Doctor>(
    specialtyId ? () => catalogService.listDoctors(specialtyId) : null,
    [specialtyId]
  );
  const slots = useRemoteList<string>(
    doctorId && date ? () => catalogService.listSlots(doctorId, date) : null,
    [doctorId, date]
  );

  const selectedSpecialty = specialties.items.find(
    (item) => item.id === specialtyId
  );
  const selectedDoctor = doctors.items.find((item) => item.id === doctorId);
  const selectedDate = dates.find((item) => item.value === date);

  // Agrupa horarios "HH:mm" por periodo usando o fuso America/Recife.
  const groupedSlots = useMemo(() => {
    if (!date || slots.items.length === 0) return [];
    const buckets: Record<DayPeriod, string[]> = {
      Manhã: [],
      Tarde: [],
      Noite: [],
    };
    for (const slot of slots.items) {
      const period = getPeriod(`${date}T${slot}:00-03:00`);
      buckets[period].push(slot);
    }
    return PERIOD_ORDER.filter((period) => buckets[period].length > 0).map(
      (period) => ({
        period,
        items: buckets[period],
      })
    );
  }, [date, slots.items]);

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

  const handleSelectSpecialty = (id: string) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (id !== specialtyId) {
      setSpecialtyId(id);
      setDoctorId(null);
      setDate(null);
      setTime(null);
    }
    setStep(2);
  };

  const handleSelectDoctor = (id: string) => {
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    if (id !== doctorId) {
      setDoctorId(id);
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
      setSubmitError(
        getApiErrorMessage(
          error,
          "Não foi possível agendar a consulta. Tente novamente."
        )
      );
      if (getApiErrorStatus(error) === 409) {
        setTime(null);
        setConflictRequiresNewSlot(true);
        slots.reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setCreatedAppointment(null);
    setSpecialtyId(null);
    setDoctorId(null);
    setDate(null);
    setTime(null);
    setSubmitError("");
    setConflictRequiresNewSlot(false);
    setStep(1);
  };

  const selectedPeriod =
    date && time ? getPeriod(`${date}T${time}:00-03:00`) : null;

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
                value={createdAppointment.specialty ?? selectedSpecialty?.name ?? "Consulta"}
              />
              <SummaryRow
                label="Médico"
                value={createdAppointment.doctorName}
              />
              <SummaryRow
                label="Data"
                value={formatLongDate(createdAppointment.dateTime)}
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

                {specialties.status === "loading" ? (
                  <LoadingState message="Carregando especialidades..." />
                ) : null}

                {specialties.status === "error" ? (
                  <ErrorState
                    message="Não foi possível carregar as especialidades."
                    onRetry={specialties.reload}
                  />
                ) : null}

                {specialties.status === "ready" &&
                specialties.items.length === 0 ? (
                  <View className="rounded-2xl border border-line bg-white p-5">
                    <Text className="text-sm text-muted">
                      Nenhuma especialidade disponível no momento.
                    </Text>
                  </View>
                ) : null}

                {specialties.status === "ready" &&
                specialties.items.length > 0 ? (
                  <View className="gap-3">
                    {specialties.items.map((specialty) => {
                      const selected = specialty.id === specialtyId;
                      return (
                        <Pressable
                          key={specialty.id}
                          onPress={() => handleSelectSpecialty(specialty.id)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            specialty.description
                              ? `${specialty.name}. ${specialty.description}`
                              : specialty.name
                          }
                          accessibilityState={{ selected }}
                          className={`min-h-[56px] justify-center rounded-2xl border-2 p-4 active:opacity-85 ${
                            selected
                              ? "border-brand bg-brand/10"
                              : "border-line bg-white"
                          }`}
                        >
                          <Text className="text-base font-bold text-ink">
                            {specialty.name}
                          </Text>
                          {specialty.description ? (
                            <Text className="mt-1 text-sm text-muted">
                              {specialty.description}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {specialtyId ? (
                  <Button label="Continuar" onPress={() => setStep(2)} />
                ) : null}
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
                  <LoadingState message="Carregando profissionais..." />
                ) : null}

                {doctors.status === "error" ? (
                  <ErrorState
                    message="Não foi possível carregar os profissionais."
                    onRetry={doctors.reload}
                  />
                ) : null}

                {doctors.status === "ready" && doctors.items.length === 0 ? (
                  <View className="gap-3 rounded-2xl border border-line bg-white p-5">
                    <Text className="text-sm text-muted">
                      Nenhum profissional disponível para esta especialidade no
                      momento.
                    </Text>
                    <Button
                      label="Escolher outra especialidade"
                      variant="outline"
                      onPress={() => setStep(1)}
                    />
                  </View>
                ) : null}

                {doctors.status === "ready" && doctors.items.length > 0 ? (
                  <View className="gap-3">
                    {doctors.items.map((doctor) => {
                      const selected = doctor.id === doctorId;
                      return (
                        <Pressable
                          key={doctor.id}
                          onPress={() => handleSelectDoctor(doctor.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${doctor.name}, CRM ${doctor.crm}`}
                          accessibilityState={{ selected }}
                          className={`min-h-[64px] flex-row items-center gap-3 rounded-2xl border-2 p-4 active:opacity-85 ${
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
                    Escolha a data
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerClassName="gap-2.5 py-1"
                  >
                    {dates.map((item) => {
                      const selected = item.value === date;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => handleSelectDate(item.value)}
                          accessibilityRole="button"
                          accessibilityLabel={item.long}
                          accessibilityState={{ selected }}
                          className={`min-h-[80px] min-w-[70px] items-center justify-center rounded-2xl border-2 px-3 py-2 active:opacity-85 ${
                            selected
                              ? "border-brand bg-brand"
                              : "border-line bg-white"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold capitalize ${
                              selected ? "text-white" : "text-muted"
                            }`}
                          >
                            {item.weekday}
                          </Text>
                          <Text
                            className={`my-0.5 text-xl font-bold ${
                              selected ? "text-white" : "text-ink"
                            }`}
                          >
                            {item.day}
                          </Text>
                          <Text
                            className={`text-xs font-semibold capitalize ${
                              selected ? "text-white" : "text-muted"
                            }`}
                          >
                            {item.month}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View className="gap-3">
                  <Text className="text-lg font-bold text-ink">
                    Escolha o horário
                  </Text>

                  {!date ? (
                    <View className="rounded-2xl border border-dashed border-line bg-white p-5">
                      <Text className="text-sm text-muted">
                        Selecione uma data acima para visualizar os horários
                        disponíveis.
                      </Text>
                    </View>
                  ) : null}

                  {date && slots.status === "loading" ? (
                    <LoadingState message="Buscando horários livres..." />
                  ) : null}

                  {date && slots.status === "error" ? (
                    <ErrorState
                      message="Não foi possível carregar os horários."
                      onRetry={slots.reload}
                    />
                  ) : null}

                  {date &&
                  slots.status === "ready" &&
                  slots.items.length === 0 ? (
                    <View className="rounded-2xl border border-line bg-white p-5">
                      <Text className="text-sm text-muted">
                        Sem horários livres neste dia. Escolha outra data.
                      </Text>
                    </View>
                  ) : null}

                  {date &&
                  slots.status === "ready" &&
                  groupedSlots.length > 0 ? (
                    <View className="gap-4">
                      {groupedSlots.map((group) => (
                        <View key={group.period} className="gap-2">
                          <Text className="text-sm font-bold text-brand-dark">
                            {group.period}
                          </Text>
                          <View className="flex-row flex-wrap gap-2.5">
                            {group.items.map((slot) => {
                              const selected = slot === time;
                              return (
                                <Pressable
                                  key={slot}
                                  onPress={() => {
                                    setTime(slot);
                                    setSubmitError("");
                                    setConflictRequiresNewSlot(false);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${slot}, ${group.period}`}
                                  accessibilityState={{ selected }}
                                  className={`min-h-[48px] min-w-[84px] items-center justify-center rounded-xl border-2 px-4 active:opacity-85 ${
                                    selected
                                      ? "border-brand bg-brand"
                                      : "border-line bg-white"
                                  }`}
                                >
                                  <Text
                                    className={`text-sm font-bold ${
                                      selected ? "text-white" : "text-ink"
                                    }`}
                                  >
                                    {slot}
                                  </Text>
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
                  disabled={!date || !time}
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
                    value={selectedDate?.long ?? ""}
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
                    disabled={!doctorId || !date || !time}
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

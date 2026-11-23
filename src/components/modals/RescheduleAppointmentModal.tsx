import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Button, Modal } from "@/components/ui";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import {
  appointmentService,
  type Appointment,
} from "@/services/appointment.service";
import {
  catalogService,
  type AvailableDateSlots,
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

export interface RescheduleAppointmentModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onRescheduled: (updated: Appointment) => void;
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

const DAYS_AHEAD = 14;
const PERIOD_ORDER: DayPeriod[] = ["Manhã", "Tarde", "Noite"];

// Modal de reagendamento mantendo o medico e exibindo apenas datas com horarios livres.
export function RescheduleAppointmentModal({
  appointment,
  onClose,
  onRescheduled,
}: RescheduleAppointmentModalProps) {
  const { appointments: patientAppointments } = useAppointments();
  const [availableDates, setAvailableDates] = useState<AvailableDateSlots[]>(
    []
  );
  const [datesStatus, setDatesStatus] = useState<LoadStatus>("idle");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const upcomingDates = useMemo(() => getUpcomingDates(DAYS_AHEAD), []);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableDates([]);
    setDatesStatus("idle");
    setSubmitting(false);
    setSubmitError("");
  }, [appointment?.id]);

  useEffect(() => {
    if (!appointment) {
      setAvailableDates([]);
      setDatesStatus("idle");
      return;
    }

    let cancelled = false;
    setDatesStatus("loading");

    catalogService
      .listAvailableDates(appointment.doctorId, upcomingDates)
      .then((list) => {
        if (cancelled) return;
        setAvailableDates(list);
        setDatesStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setDatesStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [appointment?.id, appointment?.doctorId, upcomingDates, reloadKey]);

  const dateOptions = useMemo(
    () =>
      availableDates.map((entry) => ({
        ...entry,
        ...describeDate(entry.date),
      })),
    [availableDates]
  );

  useEffect(() => {
    if (
      selectedDate &&
      !dateOptions.some((item) => item.date === selectedDate)
    ) {
      setSelectedDate(null);
      setSelectedTime(null);
    }
  }, [dateOptions, selectedDate]);

  const selectedDateEntry =
    dateOptions.find((item) => item.date === selectedDate) ?? null;

  const groupedSlots = useMemo(() => {
    if (!selectedDate || !selectedDateEntry) return [];
    const buckets: Record<DayPeriod, string[]> = {
      Manhã: [],
      Tarde: [],
      Noite: [],
    };
    for (const slot of selectedDateEntry.slots) {
      const period = getPeriod(`${selectedDate}T${slot}:00-03:00`);
      buckets[period].push(slot);
    }
    return PERIOD_ORDER.filter((period) => buckets[period].length > 0).map(
      (period) => ({
        period,
        items: buckets[period],
      })
    );
  }, [selectedDate, selectedDateEntry]);

  const conflictingSlots = useMemo(() => {
    if (!appointment || !selectedDate || !selectedDateEntry) return [];
    return selectedDateEntry.slots.filter((slot) =>
      Boolean(
        findPatientAppointmentConflict(
          patientAppointments,
          selectedDate,
          slot,
          appointment.id
        )
      )
    );
  }, [appointment, patientAppointments, selectedDate, selectedDateEntry]);

  const selectedPeriod =
    selectedDate && selectedTime
      ? getPeriod(`${selectedDate}T${selectedTime}:00-03:00`)
      : null;

  const handleConfirm = async () => {
    if (!appointment || !selectedDate || !selectedTime || submitting) return;

    const conflict = findPatientAppointmentConflict(
      patientAppointments,
      selectedDate,
      selectedTime,
      appointment.id
    );
    if (conflict) {
      setSubmitError("Você já possui outra consulta marcada neste horário.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const updated = await appointmentService.reschedule(appointment.id, {
        date: selectedDate,
        time: selectedTime,
      });
      useAppointmentStore.getState().upsert(updated);
      onRescheduled(updated);
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(
          err,
          "Não foi possível reagendar a consulta. Tente novamente."
        )
      );
      const status = getApiErrorStatus(err);
      if (status === 409) {
        setSelectedTime(null);
        setReloadKey((k) => k + 1);
      }
      if (status === 404 || status === 409) {
        void useAppointmentStore.getState().load({ force: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={submitting ? () => {} : onClose}
      title="Reagendar consulta"
      closeLabel="Fechar reagendamento"
    >
      {appointment ? (
        <ScrollView
          className="max-h-[480px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-xs font-semibold uppercase text-muted">
              Consulta atual
            </Text>
            <Text className="text-base font-bold text-brand-dark">
              {appointment.specialty ?? "Consulta"}
            </Text>
            <Text className="text-sm text-ink">{appointment.doctorName}</Text>
            <Text className="text-xs font-semibold text-brand">
              {formatLongDate(appointment.dateTime)} às{" "}
              {formatTime(appointment.dateTime)}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-ink">
              1. Escolha a nova data
            </Text>

            {datesStatus === "loading" ? (
              <View className="min-h-[88px] items-center justify-center gap-2 rounded-xl border border-line bg-white p-4">
                <ActivityIndicator size="small" color="#0e706f" />
                <Text className="text-xs text-muted">
                  Buscando datas disponíveis...
                </Text>
              </View>
            ) : null}

            {datesStatus === "error" ? (
              <View className="gap-3 rounded-xl border border-line bg-white p-4">
                <Text className="text-sm text-ink">
                  Não foi possível carregar as datas disponíveis.
                </Text>
                <Button
                  label="Tentar novamente"
                  variant="outline"
                  onPress={() => setReloadKey((k) => k + 1)}
                />
              </View>
            ) : null}

            {datesStatus === "ready" && dateOptions.length === 0 ? (
              <View className="rounded-xl border border-line bg-white p-4">
                <Text className="text-sm text-muted">
                  Este profissional não possui outros horários livres nos
                  próximos {DAYS_AHEAD} dias.
                </Text>
              </View>
            ) : null}

            {datesStatus === "ready" && dateOptions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-1"
              >
                {dateOptions.map((item) => {
                  const selected = item.date === selectedDate;
                  return (
                    <Pressable
                      key={item.date}
                      onPress={() => {
                        if (item.date !== selectedDate) {
                          setSelectedDate(item.date);
                          setSelectedTime(null);
                        }
                        setSubmitError("");
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={item.long}
                      accessibilityState={{ selected }}
                      className={`min-h-[76px] min-w-[72px] items-center justify-center rounded-2xl border-2 px-3 py-2 active:opacity-85 ${
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
                        className={`my-0.5 text-lg font-bold ${
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
            ) : null}
          </View>

          {datesStatus === "ready" && dateOptions.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-bold text-ink">
                2. Escolha o novo horário
              </Text>

              {!selectedDate ? (
                <View className="rounded-xl border border-line bg-white p-4">
                  <Text className="text-sm text-muted">
                    Selecione uma data acima para ver os horários livres.
                  </Text>
                </View>
              ) : null}

              {selectedDate && groupedSlots.length > 0 ? (
                <View className="gap-3">
                  {groupedSlots.map((group) => (
                    <View key={group.period} className="gap-2">
                      <Text className="text-xs font-bold uppercase text-brand-dark">
                        {group.period}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {group.items.map((slot) => {
                          const selected = slot === selectedTime;
                          const hasConflict = conflictingSlots.includes(slot);
                          return (
                            <Pressable
                              key={slot}
                              disabled={hasConflict}
                              onPress={() => {
                                setSelectedTime(slot);
                                setSubmitError("");
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={
                                hasConflict
                                  ? `${slot}, horário já ocupado por outra consulta`
                                  : `${slot}, ${group.period}`
                              }
                              accessibilityState={{
                                selected,
                                disabled: hasConflict,
                              }}
                              className={`min-h-[48px] min-w-[84px] items-center justify-center rounded-xl border-2 px-3 active:opacity-85 ${
                                hasConflict
                                  ? "border-line bg-line/30 opacity-55"
                                  : selected
                                    ? "border-brand bg-brand"
                                    : "border-line bg-white"
                              }`}
                            >
                              <Text
                                className={`text-sm font-bold ${
                                  hasConflict
                                    ? "text-muted line-through"
                                    : selected
                                      ? "text-white"
                                      : "text-ink"
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

                  {conflictingSlots.length > 0 ? (
                    <Text className="text-xs text-muted">
                      Horários riscados coincidem com outra consulta já agendada
                      para você.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedDateEntry && selectedTime && selectedPeriod ? (
            <View className="gap-1 rounded-xl border border-brand/30 bg-brand/10 p-3">
              <Text className="text-xs font-bold uppercase text-brand-dark">
                Novo horário selecionado
              </Text>
              <Text className="text-sm font-bold text-ink">
                {selectedDateEntry.long} às {selectedTime} ({selectedPeriod})
              </Text>
              <Text className="text-xs text-muted">
                Ao reagendar, será necessário confirmar sua presença novamente.
              </Text>
            </View>
          ) : null}

          {submitError ? (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-danger"
              >
                {submitError}
              </Text>
            </View>
          ) : null}

          <View className="gap-3 pt-1">
            <Button
              label={submitting ? "Reagendando..." : "Confirmar novo horário"}
              disabled={!selectedDate || !selectedTime}
              loading={submitting}
              onPress={() => {
                void handleConfirm();
              }}
            />
            <Button
              label="Voltar"
              variant="outline"
              disabled={submitting}
              onPress={onClose}
            />
          </View>
        </ScrollView>
      ) : null}
    </Modal>
  );
}

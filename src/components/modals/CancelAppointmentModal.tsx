import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button, Modal } from "@/components/ui";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import {
  appointmentService,
  type Appointment,
} from "@/services/appointment.service";
import { useAppointmentStore } from "@/stores/appointment.store";
import { formatLongDate, formatTime, getPeriod } from "@/utils/date";

export interface CancelAppointmentModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onCancelled: (appointment: Appointment) => void;
}

// Modal acessivel de confirmacao para cancelamento de consulta pelo paciente.
export function CancelAppointmentModal({
  appointment,
  onClose,
  onCancelled,
}: CancelAppointmentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setSubmitting(false);
  }, [appointment?.id]);

  const handleConfirm = async () => {
    if (!appointment || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await appointmentService.cancel(appointment.id);
      useAppointmentStore.getState().upsert({
        ...appointment,
        status: "CANCELADO",
      });
      onCancelled(appointment);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível cancelar a consulta. Tente novamente."
        )
      );
      const status = getApiErrorStatus(err);
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
      title="Cancelar agendamento"
      closeLabel="Fechar confirmação de cancelamento"
    >
      {appointment ? (
        <View className="gap-4">
          <Text className="text-base font-semibold text-ink">
            Deseja realmente cancelar esta consulta?
          </Text>

          <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-base font-bold text-brand-dark">
              {appointment.specialty ?? "Consulta"}
            </Text>
            <Text className="text-sm text-ink">{appointment.doctorName}</Text>
            <Text className="mt-1 text-sm font-semibold text-brand">
              {formatLongDate(appointment.dateTime)} às{" "}
              {formatTime(appointment.dateTime)} (
              {getPeriod(appointment.dateTime)})
            </Text>
          </View>

          {error ? (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-danger"
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View className="gap-3 pt-1">
            <Button
              label={submitting ? "Cancelando..." : "Confirmar cancelamento"}
              variant="danger"
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
        </View>
      ) : null}
    </Modal>
  );
}

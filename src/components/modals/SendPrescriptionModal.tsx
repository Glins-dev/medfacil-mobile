import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollView, Text, View } from "react-native";

import { Button, Input, Modal } from "@/components/ui";
import {
  prescriptionSchema,
  type PrescriptionFormData,
} from "@/schemas/prescription.schema";
import { getApiErrorMessage } from "@/services/api";
import type { DoctorAppointment } from "@/services/doctor.service";
import { prescriptionService } from "@/services/prescription.service";
import { useAuthStore } from "@/stores/auth.store";
import { buildFallbackPatientId } from "@/stores/prescription.store";
import type { Prescription } from "@/types/prescription";

export interface SendPrescriptionModalProps {
  appointment: DoctorAppointment | null;
  onClose: () => void;
  onSent: (prescription: Prescription) => void;
}

// Formulario modal para o medico enviar receita com tres campos obrigatorios.
export function SendPrescriptionModal({
  appointment,
  onClose,
  onSent,
}: SendPrescriptionModalProps) {
  const user = useAuthStore((s) => s.user);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medicationName: "",
      dosageMg: "",
      dailyInstructions: "",
    },
  });

  useEffect(() => {
    if (!appointment) return;
    reset({
      medicationName: "",
      dosageMg: "",
      dailyInstructions: "",
    });
    clearErrors();
  }, [appointment?.id, appointment, reset, clearErrors]);

  const onSubmit = async (data: PrescriptionFormData) => {
    if (!appointment || !user) return;
    clearErrors("root");

    try {
      const created = await prescriptionService.create({
        patientId:
          appointment.patientId?.trim() ||
          buildFallbackPatientId(appointment.patientName),
        patientName: appointment.patientName,
        doctorId: user.id,
        doctorName: user.name,
        doctorCrm: user.crm?.trim() || "Não informado",
        medicationName: data.medicationName,
        dosageMg: data.dosageMg,
        dailyInstructions: data.dailyInstructions,
      });
      onSent(created);
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Não foi possível enviar a receita. Tente novamente."
        ),
      });
    }
  };

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={isSubmitting ? () => {} : onClose}
      title="Enviar receita"
      closeLabel="Fechar envio de receita"
    >
      {appointment ? (
        <ScrollView
          className="max-h-[480px]"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          <View className="gap-0.5 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
              Paciente
            </Text>
            <Text className="text-base font-bold text-brand-dark">
              {appointment.patientName}
            </Text>
          </View>

          <Controller
            control={control}
            name="medicationName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do medicamento"
                value={value}
                onChangeText={(text) => {
                  if (errors.root) clearErrors("root");
                  onChange(text);
                }}
                onBlur={onBlur}
                placeholder="Ex.: Amoxicilina"
                autoCapitalize="sentences"
                editable={!isSubmitting}
                error={errors.medicationName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="dosageMg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Dosagem em mg"
                value={value}
                onChangeText={(text) => {
                  if (errors.root) clearErrors("root");
                  onChange(text);
                }}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                placeholder="Ex.: 500"
                hint="Informe o valor em miligramas (mg)."
                editable={!isSubmitting}
                error={errors.dosageMg?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="dailyInstructions"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Como tomar por dia"
                value={value}
                onChangeText={(text) => {
                  if (errors.root) clearErrors("root");
                  onChange(text);
                }}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                inputClassName="min-h-[104px] py-3"
                placeholder="Ex.: Tomar 1 comprimido a cada 8 horas por 7 dias."
                editable={!isSubmitting}
                error={errors.dailyInstructions?.message}
              />
            )}
          />

          {errors.root?.message ? (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-danger"
              >
                {errors.root.message}
              </Text>
            </View>
          ) : null}

          <View className="gap-2.5 pt-1">
            <Button
              label={isSubmitting ? "Enviando..." : "Enviar receita"}
              loading={isSubmitting}
              accessibilityLabel="Confirmar envio da receita"
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            />
            <Button
              label="Cancelar"
              variant="outline"
              disabled={isSubmitting}
              onPress={onClose}
            />
          </View>
        </ScrollView>
      ) : null}
    </Modal>
  );
}

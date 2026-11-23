import { ScrollView, Text, View } from "react-native";

import { Button, Modal } from "@/components";
import { calculateBmi, formatDecimalBr } from "@/schemas/healthProfile.schema";
import type { DoctorAppointment } from "@/services/doctor.service";
import {
  findMatchingHealthProfile,
  useHealthProfileStore,
} from "@/stores/healthProfile.store";
import { formatLongDate, formatTime } from "@/utils/date";

export interface PatientPreChartModalProps {
  appointment: DoctorAppointment | null;
  onClose: () => void;
}

function MetricCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <View
      className={`min-w-[46%] flex-1 gap-1 rounded-2xl border p-3.5 ${
        highlighted
          ? "border-[#b9e4e1] bg-[#dff4f2]"
          : "border-[#e6ecee] bg-[#f8fbfb]"
      }`}
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
        {label}
      </Text>
      <Text className="text-base font-bold text-[#004959]">{value}</Text>
    </View>
  );
}

// Modal de leitura clinica rapida do pre-prontuario preenchido pelo paciente.
export function PatientPreChartModal({
  appointment,
  onClose,
}: PatientPreChartModalProps) {
  const profiles = useHealthProfileStore((s) => s.profiles);

  if (!appointment) return null;

  const profile = findMatchingHealthProfile(profiles, {
    patientId: appointment.patientId,
    patientName: appointment.patientName,
  });

  const bmi = profile ? calculateBmi(profile.weightKg, profile.heightCm) : null;
  const hasAllergies = Boolean(
    profile &&
      (profile.allergies.length > 0 || profile.otherAllergies.trim().length > 0)
  );
  const hasComorbidities = Boolean(profile && profile.comorbidities.length > 0);
  const hasSpecialConditions = Boolean(
    profile && profile.specialConditions.trim().length > 0
  );

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      title="Pré-prontuário do paciente"
      closeLabel="Fechar pré-prontuário"
    >
      <ScrollView
        className="max-h-[540px]"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-2"
      >
        <View className="gap-1 rounded-2xl border border-[#e6ecee] bg-[#f8fbfb] p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Paciente
          </Text>
          <Text className="text-lg font-bold text-[#004959]">
            {appointment.patientName}
          </Text>
          {profile ? (
            <Text className="text-xs font-medium text-[#0e706f]">
              Atualizado em {formatLongDate(profile.updatedAt)} às{" "}
              {formatTime(profile.updatedAt)}
            </Text>
          ) : (
            <Text className="text-xs font-medium text-[#6b7280]">
              Nenhum pré-prontuário enviado até o momento.
            </Text>
          )}
        </View>

        {!profile ? (
          <View className="gap-2 rounded-2xl border border-[#e5b12c] bg-[#F7C343]/25 p-4">
            <Text className="text-base font-bold text-[#004959]">
              Pré-prontuário não preenchido
            </Text>
            <Text className="text-sm leading-relaxed text-[#004959]/90">
              Este paciente ainda não preencheu os dados clínicos na aba Minha
              saúde.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2.5">
              <MetricCard
                label="Peso"
                value={
                  profile.weightKg !== null
                    ? `${formatDecimalBr(profile.weightKg)} kg`
                    : "Não informado"
                }
              />
              <MetricCard
                label="Altura"
                value={
                  profile.heightCm !== null
                    ? `${formatDecimalBr(profile.heightCm)} cm`
                    : "Não informado"
                }
              />
              <MetricCard
                label="IMC"
                value={
                  bmi !== null
                    ? `${formatDecimalBr(bmi)} kg/m²`
                    : "Não calculado"
                }
              />
              <MetricCard
                label="Tipo sanguíneo"
                value={profile.bloodType}
                highlighted
              />
            </View>

            <View className="gap-2.5 rounded-2xl border border-[#e5b12c] bg-[#F7C343]/25 p-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#004959]">
                Alergias informadas
              </Text>

              {!hasAllergies ? (
                <Text className="text-sm font-medium text-[#004959]/85">
                  Nenhuma alergia informada pelo paciente
                </Text>
              ) : (
                <View className="gap-2.5">
                  {profile.allergies.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {profile.allergies.map((allergy) => (
                        <View
                          key={allergy}
                          className="rounded-full border border-[#e5b12c] bg-white px-3 py-1"
                        >
                          <Text className="text-xs font-bold text-[#004959]">
                            {allergy}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {profile.otherAllergies.trim() ? (
                    <View className="rounded-xl bg-white/85 px-3 py-2.5">
                      <Text className="text-[11px] font-bold uppercase tracking-wide text-[#004959]/75">
                        Outras alergias
                      </Text>
                      <Text className="mt-0.5 text-sm text-[#004959]">
                        {profile.otherAllergies}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View className="gap-2.5 rounded-2xl border border-[#e6ecee] bg-white p-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#004959]">
                Comorbidades
              </Text>

              {!hasComorbidities ? (
                <Text className="text-sm text-[#6b7280]">
                  Nenhuma comorbidade marcada
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {profile.comorbidities.map((comorbidity) => (
                    <View
                      key={comorbidity}
                      className="rounded-full bg-[#dff4f2] px-3 py-1"
                    >
                      <Text className="text-xs font-bold text-[#0e706f]">
                        {comorbidity}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="gap-2 rounded-2xl border border-[#e6ecee] bg-[#f8fbfb] p-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#004959]">
                Condições especiais e histórico
              </Text>
              <Text className="text-sm leading-relaxed text-[#1f2d33]">
                {hasSpecialConditions
                  ? profile.specialConditions
                  : "Nenhuma condição especial informada"}
              </Text>
            </View>
          </>
        )}

        <Button
          label="Fechar"
          variant="outline"
          accessibilityLabel="Fechar pré-prontuário"
          onPress={onClose}
        />
      </ScrollView>
    </Modal>
  );
}

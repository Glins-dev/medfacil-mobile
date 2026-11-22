import { Text, View } from "react-native";

export type ScheduleStepNumber = 1 | 2 | 3;

export interface ScheduleStepIndicatorProps {
  currentStep: ScheduleStepNumber;
  totalSteps?: number;
}

// Indicador de progresso horizontal continuo alinhado ao design das 3 etapas.
export function ScheduleStepIndicator({
  currentStep,
  totalSteps = 3,
}: ScheduleStepIndicatorProps) {
  const ratio = Math.min(Math.max(currentStep / totalSteps, 0), 1);
  const progressPercent = `${Math.round(ratio * 100)}%`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
      accessibilityLabel={`Etapa ${currentStep} de ${totalSteps}`}
      className="gap-2"
    >
      <Text className="text-sm font-bold text-brand">
        Etapa {currentStep} de {totalSteps}
      </Text>

      <View className="h-2 w-full overflow-hidden rounded-full bg-brand-light/20">
        <View
          style={{ width: progressPercent as `${number}%` }}
          className="h-full rounded-full bg-accent"
        />
      </View>
    </View>
  );
}

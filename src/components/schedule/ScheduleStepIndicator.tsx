import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type ScheduleStepNumber = 1 | 2 | 3 | 4;

interface StepItem {
  number: ScheduleStepNumber;
  label: string;
}

const STEPS: StepItem[] = [
  { number: 1, label: "Especialidade" },
  { number: 2, label: "Médico" },
  { number: 3, label: "Data e Hora" },
  { number: 4, label: "Confirmar" },
];

function CheckIcon() {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export interface ScheduleStepIndicatorProps {
  currentStep: ScheduleStepNumber;
}

// Indicador visual e textual das 4 etapas do agendamento.
export function ScheduleStepIndicator({
  currentStep,
}: ScheduleStepIndicatorProps) {
  const activeStep = STEPS.find((step) => step.number === currentStep);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: 4, now: currentStep }}
      accessibilityLabel={`Etapa ${currentStep} de 4: ${activeStep?.label ?? ""}`}
      className="gap-3 rounded-2xl border border-line bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wide text-brand">
          Etapa {currentStep} de 4
        </Text>
        <Text className="text-sm font-bold text-brand-dark">
          {activeStep?.label}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {STEPS.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <View key={step.number} className="flex-1 items-center gap-1.5">
              <View className="w-full flex-row items-center gap-1.5">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${
                    isCompleted
                      ? "bg-brand-light"
                      : isActive
                        ? "bg-brand"
                        : "bg-line"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? "text-white" : "text-ink"
                      }`}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>

                <View
                  className={`h-1.5 flex-1 rounded-full ${
                    isCompleted
                      ? "bg-brand-light"
                      : isActive
                        ? "bg-brand"
                        : "bg-line"
                  }`}
                />
              </View>

              <Text
                numberOfLines={1}
                className={`w-full text-[11px] font-semibold ${
                  isActive
                    ? "text-brand-dark"
                    : isCompleted
                      ? "text-brand"
                      : "text-muted"
                }`}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

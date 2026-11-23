import {
  type ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import {
  AppScreenHeader,
  Button,
  getFieldFrameStyles,
  Input,
  Modal,
} from "@/components";
import type { PatientStackParamList } from "@/navigation/types";
import {
  calculateBmi,
  formatDecimalBr,
  healthProfileSchema,
  parseHeightCmInput,
  parseWeightInput,
  type HealthProfileFormData,
} from "@/schemas/healthProfile.schema";
import { healthProfileService } from "@/services/healthProfile.service";
import { useAuthStore } from "@/stores/auth.store";
import { useHealthProfileStore } from "@/stores/healthProfile.store";
import {
  ALLERGY_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  COMORBIDITY_OPTIONS,
} from "@/types/healthProfile";
import { formatLongDate, formatTime } from "@/utils/date";

type Props = NativeStackScreenProps<PatientStackParamList, "PatientHealth">;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#eef2f4",
    borderRadius: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#004959",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: 12,
    paddingBottom: 12,
  },
});

function HeartHealthIcon() {
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <Path d="M3.22 12H9.5l1.5-3 2 5 1.5-2h5.27" />
    </Svg>
  );
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
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function HealthCheckboxItem({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      className={`min-h-[48px] flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-85 ${
        checked
          ? "border-[#0e706f] bg-[#dff4f2]"
          : "border-[#eef2f4] bg-[#f9fcfc]"
      }`}
    >
      <View
        className={`h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${
          checked
            ? "border-[#0e706f] bg-[#0e706f]"
            : "border-[#cbd5e1] bg-white"
        }`}
      >
        {checked ? <CheckIcon color="#ffffff" size={14} /> : null}
      </View>

      <Text
        className={`flex-1 text-sm ${
          checked
            ? "font-bold text-[#004959]"
            : "font-medium text-[#374151]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function toggleOption(list: string[], option: string): string[] {
  return list.includes(option)
    ? list.filter((item) => item !== option)
    : [...list, option];
}

// Tela de pre-prontuario do paciente ("Minha saude") com edicao persistida localmente.
export function PatientHealthScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useHealthProfileStore((s) => s._hasHydrated);
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom, 24) + 24;

  const [bloodTypeModalOpen, setBloodTypeModalOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const scrollToField = useCallback((sectionKey: string, fieldKey: string) => {
    const sectionY = sectionOffsetsRef.current[sectionKey] ?? 0;
    const fieldY = fieldOffsetsRef.current[fieldKey] ?? 0;
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const targetY = Math.max(0, sectionY + fieldY - 96);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 140);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<HealthProfileFormData>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      weightKg: "",
      heightCm: "",
      bloodType: "Não sei informar",
      comorbidities: [],
      specialConditions: "",
      allergies: [],
      otherAllergies: "",
    },
  });

  useEffect(() => {
    if (!hasHydrated || !user?.id) return;
    if (loadedForUserRef.current === user.id) return;
    loadedForUserRef.current = user.id;

    let active = true;
    void healthProfileService
      .getByPatient({ patientId: user.id, patientName: user.name })
      .then((existing) => {
        if (!active || !existing) return;
        reset({
          weightKg: formatDecimalBr(existing.weightKg),
          heightCm: formatDecimalBr(existing.heightCm),
          bloodType: existing.bloodType,
          comorbidities: existing.comorbidities,
          specialConditions: existing.specialConditions,
          allergies: existing.allergies,
          otherAllergies: existing.otherAllergies,
        });
        setSavedAt(existing.updatedAt);
      });

    return () => {
      active = false;
    };
  }, [hasHydrated, reset, user?.id, user?.name]);

  const watchedWeight = watch("weightKg");
  const watchedHeight = watch("heightCm");
  const parsedWeight = parseWeightInput(watchedWeight);
  const parsedHeight = parseHeightCmInput(watchedHeight);
  const liveBmi = calculateBmi(parsedWeight, parsedHeight);

  const onSubmit = async (data: HealthProfileFormData) => {
    if (!user?.id) {
      setError("root", {
        message: "Sessão expirada. Entre novamente para salvar.",
      });
      return;
    }

    clearErrors("root");
    setSaveNotice("");
    try {
      const saved = await healthProfileService.save({
        patientId: user.id,
        patientName: user.name,
        weightKg: parseWeightInput(data.weightKg),
        heightCm: parseHeightCmInput(data.heightCm),
        bloodType: data.bloodType,
        comorbidities: data.comorbidities,
        specialConditions: data.specialConditions.trim(),
        allergies: data.allergies,
        otherAllergies: data.otherAllergies.trim(),
      });
      setSavedAt(saved.updatedAt);
      setSaveNotice("Pré-prontuário salvo com sucesso.");
    } catch {
      setError("root", {
        message: "Não foi possível salvar seu pré-prontuário. Tente novamente.",
      });
    }
  };

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Minha saúde"
        subtitle="Seu pré-prontuário para agilizar consultas."
        onBackPress={() => navigation.goBack()}
        backAccessibilityLabel="Voltar para o início"
        icon={<HeartHealthIcon />}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="flex-grow gap-5 px-5 pt-6"
          contentContainerStyle={{
            paddingBottom:
              scrollBottomPadding +
              (keyboardHeight > 0 ? keyboardHeight + 32 : 0),
          }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View className="gap-1.5 rounded-2xl border border-[#b9e4e1] bg-[#dff4f2] p-4">
            <Text className="text-sm font-bold text-[#004959]">
              Agilize seu atendimento médico
            </Text>
            <Text className="text-xs leading-relaxed text-[#004959]/90">
              Suas informações de saúde ajudam o médico a revisar alergias,
              comorbidades e dados físicos antes mesmo do atendimento começar.
            </Text>
          </View>

          <View
            style={styles.card}
            onLayout={(event) => {
              sectionOffsetsRef.current.physical = event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <Text
              accessibilityRole="header"
              className="text-lg font-bold text-[#004959]"
            >
              Dados físicos e tipo sanguíneo
            </Text>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.weightKg = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="weightKg"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Peso (kg)"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("physical", "weightKg")}
                    onBlur={onBlur}
                    keyboardType="decimal-pad"
                    placeholder="Ex.: 72,5"
                    editable={!isSubmitting}
                    error={errors.weightKg?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.heightCm = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="heightCm"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Altura (cm)"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("physical", "heightCm")}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    placeholder="Ex.: 170"
                    hint="Informe em centímetros (ex.: 170) ou metros (ex.: 1,70)."
                    editable={!isSubmitting}
                    error={errors.heightCm?.message}
                  />
                )}
              />
            </View>

            {liveBmi !== null ? (
              <View className="flex-row items-center justify-between rounded-2xl border border-[#b9e4e1] bg-[#eefaf9] px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-[#0e706f]">
                  IMC calculado
                </Text>
                <Text className="text-base font-bold text-[#004959]">
                  {formatDecimalBr(liveBmi)} kg/m²
                </Text>
              </View>
            ) : null}

            <View className="w-full gap-1.5">
              <Text className="text-sm font-semibold text-[#004959]">
                Tipo sanguíneo
              </Text>

              <Controller
                control={control}
                name="bloodType"
                render={({ field: { value, onChange } }) => {
                  const { haloStyle, boxStyle } = getFieldFrameStyles({
                    active: bloodTypeModalOpen,
                    error: Boolean(errors.bloodType?.message),
                  });

                  return (
                    <>
                      <View style={haloStyle}>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setBloodTypeModalOpen(true);
                          }}
                          disabled={isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel={
                            value
                              ? `Tipo sanguíneo: ${value}. Toque para alterar`
                              : "Selecionar tipo sanguíneo"
                          }
                          accessibilityState={{
                            expanded: bloodTypeModalOpen,
                            disabled: isSubmitting,
                          }}
                          style={boxStyle}
                          className={`min-h-[48px] w-full flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-85 ${
                            isSubmitting ? "opacity-60" : ""
                          }`}
                        >
                          <Text
                            numberOfLines={1}
                            className="flex-1 text-base text-[#1f2d33]"
                          >
                            {value || "Selecione o tipo sanguíneo"}
                          </Text>

                          <ChevronDownIcon color="#0e706f" />
                        </Pressable>
                      </View>

                      <Modal
                        open={bloodTypeModalOpen}
                        onClose={() => setBloodTypeModalOpen(false)}
                        title="Selecione o tipo sanguíneo"
                        closeLabel="Fechar opções de tipo sanguíneo"
                      >
                        <ScrollView
                          className="max-h-[380px]"
                          showsVerticalScrollIndicator={false}
                          contentContainerClassName="gap-2.5 pb-2"
                        >
                          <View
                            accessibilityRole="radiogroup"
                            accessibilityLabel="Opções para tipo sanguíneo"
                            className="gap-2.5"
                          >
                            {BLOOD_TYPE_OPTIONS.map((option) => {
                              const isSelected = value === option;
                              return (
                                <Pressable
                                  key={option}
                                  onPress={() => {
                                    onChange(option);
                                    setBloodTypeModalOpen(false);
                                  }}
                                  accessibilityRole="radio"
                                  accessibilityLabel={option}
                                  accessibilityState={{
                                    selected: isSelected,
                                    checked: isSelected,
                                  }}
                                  className={`min-h-[48px] flex-row items-center justify-between gap-3 rounded-2xl border px-4 py-3 active:opacity-85 ${
                                    isSelected
                                      ? "border-[#0e706f] bg-[#dff4f2]"
                                      : "border-[#eef2f4] bg-[#f9fcfc]"
                                  }`}
                                >
                                  <Text
                                    className={`text-base ${
                                      isSelected
                                        ? "font-bold text-[#0e706f]"
                                        : "font-medium text-[#4b5563]"
                                    }`}
                                  >
                                    {option}
                                  </Text>

                                  {isSelected ? (
                                    <CheckIcon color="#0e706f" size={18} />
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </Modal>
                    </>
                  );
                }}
              />

              {errors.bloodType?.message ? (
                <Text
                  accessibilityRole="alert"
                  className="text-xs font-medium text-danger"
                >
                  {errors.bloodType.message}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={styles.card}
            onLayout={(event) => {
              sectionOffsetsRef.current.comorbidities =
                event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <View className="gap-0.5">
              <Text
                accessibilityRole="header"
                className="text-lg font-bold text-[#004959]"
              >
                Comorbidades e histórico
              </Text>
              <Text className="text-xs text-[#6b7280]">
                Marque as condições de saúde que você possui ou já tratou.
              </Text>
            </View>

            <Controller
              control={control}
              name="comorbidities"
              render={({ field: { value, onChange } }) => (
                <View className="gap-2">
                  {COMORBIDITY_OPTIONS.map((option) => (
                    <HealthCheckboxItem
                      key={option}
                      label={option}
                      checked={value.includes(option)}
                      disabled={isSubmitting}
                      onToggle={() => onChange(toggleOption(value, option))}
                    />
                  ))}
                </View>
              )}
            />

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.specialConditions =
                  event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="specialConditions"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Condições especiais ou histórico relevante"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() =>
                      scrollToField("comorbidities", "specialConditions")
                    }
                    onBlur={onBlur}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    placeholder="Ex.: Já tive câncer, sofri um AVC, fiz cirurgia cardíaca..."
                    editable={!isSubmitting}
                    style={styles.multilineInput}
                    error={errors.specialConditions?.message}
                  />
                )}
              />
            </View>
          </View>

          <View
            style={styles.card}
            onLayout={(event) => {
              sectionOffsetsRef.current.allergies = event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <View className="gap-0.5">
              <Text
                accessibilityRole="header"
                className="text-lg font-bold text-[#004959]"
              >
                Alergias
              </Text>
              <Text className="text-xs text-[#6b7280]">
                Selecione medicamentos, substâncias ou alimentos aos quais você
                tem alergia.
              </Text>
            </View>

            <Controller
              control={control}
              name="allergies"
              render={({ field: { value, onChange } }) => (
                <View className="gap-2">
                  {ALLERGY_OPTIONS.map((option) => (
                    <HealthCheckboxItem
                      key={option}
                      label={option}
                      checked={value.includes(option)}
                      disabled={isSubmitting}
                      onToggle={() => onChange(toggleOption(value, option))}
                    />
                  ))}
                </View>
              )}
            />

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.otherAllergies =
                  event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="otherAllergies"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Outras alergias (caso não esteja na lista)"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("allergies", "otherAllergies")}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    placeholder="Ex.: Alergia a camarão, corante amarelo, medicamentos específicos..."
                    editable={!isSubmitting}
                    style={styles.multilineInput}
                    error={errors.otherAllergies?.message}
                  />
                )}
              />
            </View>
          </View>

          {saveNotice ? (
            <View
              accessibilityRole="alert"
              className="gap-1 rounded-2xl border border-[#0e706f]/30 bg-[#dff4f2] px-4 py-3.5"
            >
              <Text className="text-sm font-bold text-[#004959]">
                {saveNotice}
              </Text>
              {savedAt ? (
                <Text className="text-xs font-medium text-[#0e706f]">
                  Atualizado em {formatLongDate(savedAt)} às {formatTime(savedAt)}
                </Text>
              ) : null}
            </View>
          ) : savedAt ? (
            <Text className="text-center text-xs font-medium text-[#6b7280]">
              Última atualização em {formatLongDate(savedAt)} às{" "}
              {formatTime(savedAt)}
            </Text>
          ) : null}

          {errors.root?.message ? (
            <View className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-danger"
              >
                {errors.root.message}
              </Text>
            </View>
          ) : null}

          <View className="pt-1">
            <Button
              label={isSubmitting ? "Salvando..." : "Salvar pré-prontuário"}
              accessibilityLabel="Salvar pré-prontuário"
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              loading={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

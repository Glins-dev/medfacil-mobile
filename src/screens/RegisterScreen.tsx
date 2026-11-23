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
import type { AuthStackParamList } from "@/navigation/types";
import { registerSchema, type RegisterFormData } from "@/schemas/auth.schema";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { saveLocalUserAddress, useAuthStore } from "@/stores/auth.store";
import { USER_SEX_OPTIONS } from "@/types/user";
import { maskCpf, onlyDigits } from "@/utils/cpf";
import { maskDate } from "@/utils/date";
import { maskPhone } from "@/utils/masks";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#eef2f4",
    borderRadius: 28,
    backgroundColor: "#ffffff",
    shadowColor: "#004959",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
});

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

function CheckIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

// Tela de autocadastro do paciente com dropdown de sexo e rolagem ajustada ao teclado.
export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom, 24) + 16;

  const [sexModalOpen, setSexModalOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cardTopOffsetRef = useRef(0);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scrollToField = useCallback((fieldKey: string) => {
    const fieldY = fieldOffsetsRef.current[fieldKey];
    if (fieldY === undefined) return;
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const targetY = Math.max(0, cardTopOffsetRef.current + fieldY - 100);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 120);
  }, []);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      phone: "",
      birthDate: "",
      endereco: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearErrors("root");
    const trimmedAddress = data.endereco.trim();
    const digitsCpf = onlyDigits(data.cpf);
    try {
      const response = await authService.register({
        name: data.name.trim(),
        email: data.email.trim(),
        cpf: data.cpf,
        phone: data.phone,
        birthDate: data.birthDate,
        sexo: data.sexo,
        endereco: trimmedAddress,
        password: data.password,
      });
      const resolvedAddress =
        response.user.endereco ?? response.user.address ?? trimmedAddress;
      await saveLocalUserAddress({
        userId: response.user.id,
        cpf: digitsCpf,
        address: resolvedAddress,
      });
      useAuthStore.getState().setSession(response.token, {
        ...response.user,
        cpf: response.user.cpf ?? digitsCpf,
        birthDate: response.user.birthDate ?? data.birthDate,
        sexo: response.user.sexo ?? data.sexo,
        endereco: resolvedAddress,
      });
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Erro ao criar conta."),
      });
    }
  };

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Crie sua conta"
        subtitle="Preencha os dados abaixo. É rápido e seguro."
        onBackPress={() => navigation.goBack()}
        backAccessibilityLabel="Voltar para o login"
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
          <View
            style={styles.card}
            onLayout={(event) => {
              cardTopOffsetRef.current = event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.name = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nome completo"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("name")}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="name"
                    placeholder="Digite seu nome"
                    editable={!isSubmitting}
                    error={errors.name?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.email = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="E-mail"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("email")}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="Digite seu e-mail"
                    editable={!isSubmitting}
                    error={errors.email?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.cpf = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="cpf"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="CPF"
                    value={value}
                    onChangeText={(text) => onChange(maskCpf(text))}
                    onFocus={() => scrollToField("cpf")}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={14}
                    placeholder="Digite seu CPF"
                    editable={!isSubmitting}
                    error={errors.cpf?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.phone = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Telefone"
                    value={value}
                    onChangeText={(text) => onChange(maskPhone(text))}
                    onFocus={() => scrollToField("phone")}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    maxLength={15}
                    placeholder="(DDD) 99999-9999"
                    editable={!isSubmitting}
                    error={errors.phone?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.birthDate = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="birthDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Data de Nascimento"
                    value={value}
                    onChangeText={(text) => onChange(maskDate(text))}
                    onFocus={() => scrollToField("birthDate")}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    editable={!isSubmitting}
                    error={errors.birthDate?.message}
                  />
                )}
              />
            </View>

            <View className="w-full gap-1.5">
              <Text className="text-sm font-semibold text-[#004959]">Sexo</Text>

              <Controller
                control={control}
                name="sexo"
                render={({ field: { value, onChange } }) => {
                  const { haloStyle, boxStyle } = getFieldFrameStyles({
                    active: sexModalOpen,
                    error: Boolean(errors.sexo?.message),
                  });

                  return (
                    <>
                      <View style={haloStyle}>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setSexModalOpen(true);
                          }}
                          disabled={isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel={
                            value
                              ? `Sexo: ${value}. Toque para alterar`
                              : "Selecionar sexo"
                          }
                          accessibilityState={{
                            expanded: sexModalOpen,
                            disabled: isSubmitting,
                          }}
                          style={boxStyle}
                          className={`min-h-[48px] w-full flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-85 ${
                            isSubmitting ? "opacity-60" : ""
                          }`}
                        >
                          <Text
                            numberOfLines={1}
                            className={`flex-1 text-base ${
                              value ? "text-ink" : "text-[#6b7280]"
                            }`}
                          >
                            {value || "Selecione o sexo"}
                          </Text>

                          <ChevronDownIcon color="#0e706f" />
                        </Pressable>
                      </View>

                      <Modal
                        open={sexModalOpen}
                        onClose={() => setSexModalOpen(false)}
                        title="Selecione o sexo"
                        closeLabel="Fechar opções de sexo"
                      >
                        <View
                          accessibilityRole="radiogroup"
                          accessibilityLabel="Opções para sexo"
                          className="gap-2.5 pb-2"
                        >
                          {USER_SEX_OPTIONS.map((option) => {
                            const isSelected = value === option;
                            return (
                              <Pressable
                                key={option}
                                onPress={() => {
                                  if (errors.root) clearErrors("root");
                                  onChange(option);
                                  setSexModalOpen(false);
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

                                {isSelected ? <CheckIcon /> : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      </Modal>
                    </>
                  );
                }}
              />

              {errors.sexo?.message ? (
                <Text
                  accessibilityRole="alert"
                  className="text-xs font-medium text-danger"
                >
                  {errors.sexo.message}
                </Text>
              ) : null}
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.endereco = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="endereco"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Endereço"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("endereco")}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="street-address"
                    placeholder="Ex.: Rua das Flores, 123, Bairro, Cidade, UF"
                    hint="Informe rua, número, bairro, cidade e estado."
                    editable={!isSubmitting}
                    error={errors.endereco?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.password = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Senha"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("password")}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Crie uma senha segura"
                    hint="Mínimo de 8 caracteres"
                    editable={!isSubmitting}
                    error={errors.password?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.confirmPassword =
                  event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirmar senha"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("confirmPassword")}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    editable={!isSubmitting}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </View>

            <Text className="pt-1 text-xs text-[#6b7280]">
              Ao continuar, você concorda com os Termos de uso e a Política de
              privacidade.
            </Text>

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

            <Button
              label={isSubmitting ? "Criando..." : "Criar conta"}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              loading={isSubmitting}
            />
          </View>

          <View className="mt-auto gap-3 pb-2">
            <Text className="text-center text-sm text-[#6b7280]">
              Já tem uma conta?
            </Text>
            <Button
              label="Entrar"
              variant="outline"
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Login")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

import { useRef, useState, type ComponentRef } from "react";
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
  TextInput,
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

// Tela de autocadastro do paciente com seleção de gênero e rolagem ajustada ao teclado.
export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom, 24) + 16;

  const [sexModalOpen, setSexModalOpen] = useState(false);
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const cpfRef = useRef<ComponentRef<typeof TextInput>>(null);
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);
  const birthDateRef = useRef<ComponentRef<typeof TextInput>>(null);
  const addressRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmPasswordRef = useRef<ComponentRef<typeof TextInput>>(null);
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
          className="flex-1"
          contentContainerClassName="flex-grow gap-5 px-5 pt-6"
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <View style={styles.card} className="gap-4 p-5">
            <View>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={nameRef}
                    label="Nome completo"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="name"
                    placeholder="Digite seu nome"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    error={errors.name?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={emailRef}
                    label="E-mail"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="Digite seu e-mail"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => cpfRef.current?.focus()}
                    error={errors.email?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="cpf"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={cpfRef}
                    label="CPF"
                    value={value}
                    onChangeText={(text) => onChange(maskCpf(text))}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={14}
                    placeholder="Digite seu CPF"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    error={errors.cpf?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={phoneRef}
                    label="Telefone"
                    value={value}
                    onChangeText={(text) => onChange(maskPhone(text))}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    maxLength={15}
                    placeholder="(DDD) 99999-9999"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => birthDateRef.current?.focus()}
                    error={errors.phone?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="birthDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={birthDateRef}
                    label="Data de Nascimento"
                    value={value}
                    onChangeText={(text) => onChange(maskDate(text))}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => addressRef.current?.focus()}
                    error={errors.birthDate?.message}
                  />
                )}
              />
            </View>

            <View className="w-full gap-1.5">
              <Text className="text-sm font-semibold text-[#004959]">Gênero</Text>

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
                              ? `Gênero: ${value}. Toque para alterar`
                              : "Selecionar gênero"
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
                            {value || "Selecione o gênero"}
                          </Text>

                          <ChevronDownIcon color="#0e706f" />
                        </Pressable>
                      </View>

                      <Modal
                        open={sexModalOpen}
                        onClose={() => setSexModalOpen(false)}
                        title="Selecione o gênero"
                        closeLabel="Fechar opções de gênero"
                      >
                        <View
                          accessibilityRole="radiogroup"
                          accessibilityLabel="Opções para gênero"
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

            <View>
              <Controller
                control={control}
                name="endereco"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={addressRef}
                    label="Endereço"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="street-address"
                    placeholder="Ex.: Rua das Flores, 123, Bairro, Cidade, UF"
                    hint="Informe rua, número, bairro, cidade e estado."
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={errors.endereco?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={passwordRef}
                    label="Senha"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Crie uma senha segura"
                    hint="Mínimo de 8 caracteres"
                    editable={!isSubmitting}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    error={errors.password?.message}
                  />
                )}
              />
            </View>

            <View>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    ref={confirmPasswordRef}
                    label="Confirmar senha"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    editable={!isSubmitting}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void handleSubmit(onSubmit)();
                    }}
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

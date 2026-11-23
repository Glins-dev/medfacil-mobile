import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Input, TextLink } from "@/components";
import type { AuthStackParamList } from "@/navigation/types";
import { registerSchema, type RegisterFormData } from "@/schemas/auth.schema";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { maskCpf, onlyDigits } from "@/utils/cpf";
import { maskDate } from "@/utils/date";
import { maskPhone } from "@/utils/masks";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

// Tela de autocadastro do paciente com mascaras automaticas e login apos criacao.
export function RegisterScreen({ navigation }: Props) {
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
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearErrors("root");
    try {
      const response = await authService.register({
        name: data.name.trim(),
        email: data.email.trim(),
        cpf: data.cpf,
        phone: data.phone,
        birthDate: data.birthDate,
        password: data.password,
      });
      useAuthStore.getState().setSession(response.token, {
        ...response.user,
        cpf: response.user.cpf ?? onlyDigits(data.cpf),
        birthDate: response.user.birthDate ?? data.birthDate,
      });
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Erro ao criar conta."),
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <TextLink
              label="← Voltar"
              disabled={isSubmitting}
              onPress={() => navigation.goBack()}
            />
            <Text className="text-lg font-bold tracking-tight text-brand-dark">
              Med<Text className="font-semibold italic text-brand">fácil</Text>
            </Text>
          </View>

          <View className="mt-4">
            <Text
              accessibilityRole="header"
              className="text-3xl font-bold text-ink"
            >
              Crie sua conta
            </Text>
            <Text className="mt-1 text-base text-muted">
              Preencha os dados abaixo. É rápido e seguro.
            </Text>
          </View>

          <View className="mt-6 gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nome completo"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  autoComplete="name"
                  placeholder="Digite seu nome"
                  editable={!isSubmitting}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="E-mail"
                  value={value}
                  onChangeText={onChange}
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

            <Controller
              control={control}
              name="cpf"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="CPF"
                  value={value}
                  onChangeText={(text) => onChange(maskCpf(text))}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={14}
                  placeholder="Digite seu CPF"
                  editable={!isSubmitting}
                  error={errors.cpf?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Telefone"
                  value={value}
                  onChangeText={(text) => onChange(maskPhone(text))}
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

            <Controller
              control={control}
              name="birthDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Data de Nascimento"
                  value={value}
                  onChangeText={(text) => onChange(maskDate(text))}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  editable={!isSubmitting}
                  error={errors.birthDate?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
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
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmar senha"
                  value={value}
                  onChangeText={onChange}
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

            <Text className="pt-1 text-xs text-muted">
              Ao continuar, você concorda com os Termos de uso e a Política de
              privacidade.
            </Text>

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

            <Button
              label={isSubmitting ? "Criando..." : "Criar conta"}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              loading={isSubmitting}
            />
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm text-muted">Já tenho uma conta.</Text>
            <TextLink
              label="Entrar"
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Login")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

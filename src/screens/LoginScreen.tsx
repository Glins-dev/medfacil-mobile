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
import { loginSchema, type LoginFormData } from "@/schemas/auth.schema";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { maskCpf } from "@/utils/cpf";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// Tela de autenticacao por CPF e senha integrada ao authService e SecureStore.
export function LoginScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      cpf: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearErrors("root");
    try {
      const response = await authService.login(data);
      useAuthStore.getState().setSession(response.token, response.user);
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Erro ao fazer login."),
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
          contentContainerClassName="flex-grow px-6 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-end">
            <Text className="text-lg font-bold tracking-tight text-brand-dark">
              Med<Text className="font-semibold italic text-brand">fácil</Text>
            </Text>
          </View>

          <View className="mt-8">
            <Text
              accessibilityRole="header"
              className="text-2xl font-bold text-brand-dark"
            >
              Entre na sua conta
            </Text>
            <Text className="mt-2 text-sm text-muted">
              Use seu CPF e sua senha para acessar suas consultas.
            </Text>
          </View>

          <View className="mt-8 gap-5">
            <Controller
              control={control}
              name="cpf"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="CPF"
                  value={value}
                  onChangeText={(text) => {
                    if (errors.root) clearErrors("root");
                    onChange(maskCpf(text));
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  autoComplete="username"
                  maxLength={14}
                  placeholder="Digite seu CPF"
                  editable={!isSubmitting}
                  error={errors.cpf?.message}
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
                  onChangeText={(text) => {
                    if (errors.root) clearErrors("root");
                    onChange(text);
                  }}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  editable={!isSubmitting}
                  error={errors.password?.message}
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
          </View>

          <View className="mt-auto items-center gap-4 pt-10">
            <Button
              label={isSubmitting ? "Entrando..." : "Entrar"}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              loading={isSubmitting}
            />

            <View className="flex-row items-center">
              <Text className="text-sm text-muted">Ainda não tem conta?</Text>
              <TextLink
                label="Criar conta"
                disabled={isSubmitting}
                onPress={() => navigation.navigate("Register")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

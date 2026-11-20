import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Field, TextLink } from "@/components/ui";
import type { AuthStackParamList, UserRole } from "@/navigation/types";
import { api, getApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isValidCpf, maskCpf, onlyDigits } from "@/utils/cpf";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

export function LoginScreen({ navigation }: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cpfInvalid = !cpf ? "CPF é obrigatório" : !isValidCpf(cpf) ? "CPF inválido" : "";
    const passInvalid = password ? "" : "Senha é obrigatória";
    setCpfError(cpfInvalid);
    setPasswordError(passInvalid);
    setSubmitError("");
    if (cpfInvalid || passInvalid) return;

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        cpf: onlyDigits(cpf),
        password,
      });
      setSession(data.token, data.user);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Erro ao fazer login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-right text-lg font-bold text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>

          <View className="mt-8">
            <Text accessibilityRole="header" className="text-2xl font-bold text-brand-dark">
              Entre na sua conta
            </Text>
            <Text className="mt-2 text-sm text-muted">
              Use seu CPF e sua senha para acessar suas consultas.
            </Text>
          </View>

          <View className="mt-8 gap-5">
            <Field
              label="CPF"
              value={cpf}
              onChangeText={(v) => setCpf(maskCpf(v))}
              keyboardType="number-pad"
              autoComplete="username"
              placeholder="Digite seu CPF"
              error={cpfError}
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              error={passwordError}
            />
            {submitError ? (
              <Text accessibilityRole="alert" className="text-center text-sm text-danger">
                {submitError}
              </Text>
            ) : null}
          </View>

          <View className="mt-auto items-center gap-3 pt-10">
            <Button label={loading ? "Entrando..." : "Entrar"} onPress={handleSubmit} loading={loading} />
            <View className="flex-row items-center">
              <Text className="text-sm text-muted">Ainda não tem conta?</Text>
              <TextLink label="Criar conta" onPress={() => navigation.navigate("Register")} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

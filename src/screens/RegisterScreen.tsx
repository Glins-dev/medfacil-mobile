import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Field, TextLink } from "@/components/ui";
import type { AuthStackParamList, UserRole } from "@/navigation/types";
import { api, getApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isValidCpf, maskCpf, onlyDigits } from "@/utils/cpf";
import { isValidBirthDate, maskDate, maskPhone } from "@/utils/masks";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

interface Form {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  password: string;
}

type Errors = Partial<Record<keyof Form, string>>;

const initialForm: Form = {
  name: "",
  email: "",
  cpf: "",
  phone: "",
  birthDate: "",
  password: "",
};

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 3) errors.name = "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = "Informe um e-mail válido.";
  if (!isValidCpf(form.cpf)) errors.cpf = "CPF inválido.";
  if (onlyDigits(form.phone).length < 10) errors.phone = "Informe o DDD e o telefone.";
  if (!isValidBirthDate(form.birthDate)) errors.birthDate = "Use o formato DD/MM/AAAA.";
  if (form.password.length < 8) errors.password = "Mínimo de 8 caracteres.";
  return errors;
}

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState<Form>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (field: keyof Form, mask?: (v: string) => string) => (value: string) => {
    setForm((current) => ({ ...current, [field]: mask ? mask(value) : value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const found = validate(form);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        cpf: onlyDigits(form.cpf),
        phone: onlyDigits(form.phone),
        birthDate: form.birthDate,
        password: form.password,
      });
      setSession(data.token, data.user);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Erro ao criar conta."));
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
          contentContainerClassName="px-6 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <TextLink label="← Voltar" onPress={() => navigation.goBack()} />
            <Text className="text-lg font-bold text-brand-dark">
              Med<Text className="font-semibold italic text-brand">fácil</Text>
            </Text>
          </View>

          <Text accessibilityRole="header" className="mt-4 text-3xl font-bold text-ink">
            Crie sua conta
          </Text>
          <Text className="mt-1 text-base text-muted">
            Preencha os dados abaixo. É rápido e seguro.
          </Text>

          <View className="mt-5 gap-4">
            <Field label="Nome completo" value={form.name} onChangeText={change("name")}
              autoComplete="name" placeholder="Digite seu nome" error={errors.name} />
            <Field label="E-mail" value={form.email} onChangeText={change("email")}
              keyboardType="email-address" autoCapitalize="none" autoComplete="email"
              placeholder="Digite seu e-mail" error={errors.email} />
            <Field label="CPF" value={form.cpf} onChangeText={change("cpf", maskCpf)}
              keyboardType="number-pad" placeholder="Digite seu CPF" error={errors.cpf} />
            <Field label="Telefone" value={form.phone} onChangeText={change("phone", maskPhone)}
              keyboardType="phone-pad" autoComplete="tel" placeholder="(DDD) 99999-9999"
              error={errors.phone} />
            <Field label="Data de Nascimento" value={form.birthDate}
              onChangeText={change("birthDate", maskDate)} keyboardType="number-pad"
              placeholder="DD/MM/AAAA" error={errors.birthDate} />
            <Field label="Senha" value={form.password} onChangeText={change("password")}
              secureTextEntry autoCapitalize="none" autoComplete="new-password"
              placeholder="Crie uma senha segura" error={errors.password} />

            {submitError ? (
              <Text accessibilityRole="alert" className="text-center text-sm text-danger">
                {submitError}
              </Text>
            ) : null}

            <Button label={loading ? "Criando..." : "Criar conta"} onPress={handleSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

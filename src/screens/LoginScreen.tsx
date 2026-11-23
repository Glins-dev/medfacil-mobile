import {
  type ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BrandLogo, Button, Input } from "@/components";
import type { AuthStackParamList } from "@/navigation/types";
import { loginSchema, type LoginFormData } from "@/schemas/auth.schema";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { maskCpf, onlyDigits } from "@/utils/cpf";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
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

// Tela de autenticacao por CPF e senha com controle ativo de teclado e rolagem.
export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0)
        : 0;
  const scrollBottomPadding = Math.max(insets.bottom, 24) + 16;

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
      useAuthStore.getState().setSession(response.token, {
        ...response.user,
        cpf: response.user.cpf ?? onlyDigits(data.cpf),
      });
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Erro ao fazer login."),
      });
    }
  };

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <LinearGradient
        colors={["#c6eceb", "#dcf4f2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: topInset + 24 }]}
      >
        <View className="items-center">
          <BrandLogo height={38} />
        </View>

        <Text
          accessibilityRole="header"
          className="mt-5 text-center text-2xl font-bold leading-tight text-[#004959]"
        >
          Entre na sua conta
        </Text>
        <Text className="mt-1.5 text-center text-sm font-medium text-[#0e706f]">
          Use seu CPF e sua senha para acessar suas consultas.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-6"
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
            className="gap-5 p-6"
          >
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
                    onChangeText={(text) => {
                      if (errors.root) clearErrors("root");
                      onChange(maskCpf(text));
                    }}
                    onFocus={() => scrollToField("cpf")}
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
                    onChangeText={(text) => {
                      if (errors.root) clearErrors("root");
                      onChange(text);
                    }}
                    onFocus={() => scrollToField("password")}
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
            </View>

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
                label={isSubmitting ? "Entrando..." : "Entrar"}
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
                loading={isSubmitting}
              />
            </View>
          </View>

          <View className="mt-auto gap-3 pt-2">
            <Text className="text-center text-sm text-[#6b7280]">
              Ainda não tem conta?
            </Text>
            <Button
              label="Criar conta"
              variant="outline"
              disabled={isSubmitting}
              onPress={() => navigation.navigate("Register")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

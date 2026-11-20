import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

/** Botão com área de toque mínima de 48px (>= 44px) e feedback de pressão. */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const container =
    variant === "primary"
      ? "bg-brand"
      : variant === "danger"
        ? "bg-danger"
        : "border-2 border-brand bg-transparent";
  const text = variant === "secondary" ? "text-brand" : "text-white";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-xl px-6 active:opacity-80 ${container} ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      {loading && (
        <ActivityIndicator
          color={variant === "secondary" ? "#0e706f" : "#ffffff"}
        />
      )}
      <Text className={`text-base font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/** Campo de texto com label, erro e alvo de toque >= 48px. */
export function Field({ label, error, secureTextEntry, ...rest }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View className="w-full gap-1.5">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#5f6b6f"
          secureTextEntry={isPassword && hidden}
          className={`min-h-[48px] w-full rounded-xl border bg-white px-4 text-base text-ink ${
            error ? "border-danger" : "border-line"
          } ${isPassword ? "pr-20" : ""}`}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
            className="absolute right-0 h-12 min-w-[44px] items-center justify-center px-3"
          >
            <Text className="text-sm font-semibold text-brand">
              {hidden ? "Mostrar" : "Ocultar"}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="text-xs text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Link textual com alvo de toque mínimo de 44px. */
export function TextLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="min-h-[44px] items-center justify-center px-2"
    >
      <Text className="text-sm font-semibold text-brand underline">{label}</Text>
    </Pressable>
  );
}

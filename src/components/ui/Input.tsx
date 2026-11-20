import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  inputClassName?: string;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5f6b6f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <Circle cx="12" cy="12" r="3" />
      {off ? <Path d="M4 4l16 16" /> : null}
    </Svg>
  );
}

// Campo de texto acessivel com rotulo explicito, destaque de foco e toggle de senha.
export function Input({
  label,
  error,
  hint,
  secureTextEntry,
  editable = true,
  onFocus,
  onBlur,
  containerClassName = "",
  inputClassName = "",
  accessibilityLabel,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const borderClass = error
    ? "border-danger"
    : focused
      ? "border-brand"
      : "border-line";

  return (
    <View className={`w-full gap-1.5 ${containerClassName}`}>
      {label ? (
        <Text className="text-sm font-semibold text-ink">{label}</Text>
      ) : null}

      <View className="relative justify-center">
        <TextInput
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor="#5f6b6f"
          secureTextEntry={isPassword && !showPassword}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={`min-h-[48px] w-full rounded-xl border-2 bg-white px-4 text-base text-ink ${borderClass} ${
            isPassword ? "pr-14" : ""
          } ${!editable ? "opacity-60" : ""} ${inputClassName}`}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
            hitSlop={4}
            className="absolute right-1 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg active:opacity-70"
          >
            <EyeIcon off={showPassword} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-xs font-medium text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { getFieldFrameStyles } from "./focusGlow";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  inputClassName?: string;
}

const styles = StyleSheet.create({
  inputBase: {
    minHeight: 48,
    width: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f2d33",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  eyeButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    minWidth: 36,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 2,
    borderRadius: 10,
  },
});

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

// Campo de texto acessivel com rotulo explicito, halo neon esverdeado no foco e toggle de senha externo.
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
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const { haloStyle, boxStyle } = getFieldFrameStyles({
    active: focused,
    error: Boolean(error),
  });

  return (
    <View className={`w-full gap-1.5 ${containerClassName}`}>
      {label ? (
        <Text className="text-sm font-semibold text-[#004959]">{label}</Text>
      ) : null}

      <View style={haloStyle}>
        <TextInput
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor="#6b7280"
          secureTextEntry={isPassword && !showPassword}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={inputClassName || undefined}
          style={[
            styles.inputBase,
            boxStyle,
            !editable ? styles.inputDisabled : null,
            style,
          ]}
          {...rest}
        />
      </View>

      {isPassword ? (
        <Pressable
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword ? "Ocultar senha" : "Mostrar senha"
          }
          hitSlop={8}
          style={({ pressed }) => [
            styles.eyeButton,
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <EyeIcon off={showPassword} />
        </Pressable>
      ) : null}

      {error ? (
        <Text accessibilityRole="alert" className="text-xs font-medium text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-xs text-[#6b7280]">{hint}</Text>
      ) : null}
    </View>
  );
}

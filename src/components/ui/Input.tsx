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
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputBase: {
    minHeight: 48,
    width: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f2d33",
  },
  inputPassword: {
    paddingRight: 52,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  eyeButton: {
    position: "absolute",
    right: 2,
    top: 0,
    bottom: 0,
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
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

// Campo de texto acessivel com rotulo explicito, halo neon esverdeado no foco e toggle de senha.
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
        <View style={styles.inputWrapper}>
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
              isPassword ? styles.inputPassword : null,
              !editable ? styles.inputDisabled : null,
              style,
            ]}
            {...rest}
          />

          {isPassword ? (
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
              hitSlop={4}
              style={({ pressed }) => [
                styles.eyeButton,
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <EyeIcon off={showPassword} />
            </Pressable>
          ) : null}
        </View>
      </View>

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

import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "danger-outline"
  | "ghost";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  textClassName?: string;
}

const variantContainer: Record<Exclude<ButtonVariant, "primary">, string> = {
  secondary: "bg-brand-dark",
  outline: "border-2 border-[#0e706f] bg-white",
  danger: "bg-danger",
  "danger-outline": "border-2 border-danger bg-white",
  ghost: "bg-transparent",
};

const variantText: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-[#0e706f]",
  danger: "text-white",
  "danger-outline": "text-danger",
  ghost: "text-brand-dark",
};

// Botao acessivel com altura minima de 48px (>= 44pt) e gradiente da marca na variante primaria.
export function Button({
  label,
  children,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled = false,
  className = "",
  textClassName = "",
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const resolvedLabel =
    accessibilityLabel ??
    label ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined);

  const spinnerColor =
    variant === "danger-outline"
      ? "#d64545"
      : variant === "outline" || variant === "ghost"
        ? "#0e706f"
        : "#ffffff";

  const content = (
    <View className="flex-row items-center justify-center gap-2">
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      {children !== undefined ? (
        typeof children === "string" || typeof children === "number" ? (
          <Text
            className={`text-base font-semibold ${variantText[variant]} ${textClassName}`}
          >
            {children}
          </Text>
        ) : (
          children
        )
      ) : label ? (
        <Text
          className={`text-base font-semibold ${variantText[variant]} ${textClassName}`}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );

  const widthClass = fullWidth ? "w-full" : "self-start";
  const disabledClass = isDisabled ? "opacity-60" : "";

  if (variant === "primary") {
    return (
      <Pressable
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        className={`overflow-hidden rounded-2xl active:opacity-85 ${widthClass} ${disabledClass} ${className}`}
        {...rest}
      >
        <LinearGradient
          colors={["#0e706f", "#29a4b4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            minHeight: 48,
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-[48px] items-center justify-center rounded-2xl px-6 py-3 active:opacity-85 ${widthClass} ${variantContainer[variant]} ${disabledClass} ${className}`}
      {...rest}
    >
      {content}
    </Pressable>
  );
}

import type { ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";

export interface TextLinkProps extends Omit<PressableProps, "children"> {
  label?: string;
  children?: ReactNode;
  className?: string;
  textClassName?: string;
}

// Link textual acessivel com alvo de toque minimo de 44px.
export function TextLink({
  label,
  children,
  className = "",
  textClassName = "",
  accessibilityLabel,
  ...rest
}: TextLinkProps) {
  const resolvedLabel =
    accessibilityLabel ??
    label ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={resolvedLabel}
      className={`min-h-[44px] items-center justify-center px-2 active:opacity-70 ${className}`}
      {...rest}
    >
      {children !== undefined ? (
        typeof children === "string" || typeof children === "number" ? (
          <Text
            className={`text-sm font-semibold text-brand underline ${textClassName}`}
          >
            {children}
          </Text>
        ) : (
          children
        )
      ) : label ? (
        <Text
          className={`text-sm font-semibold text-brand underline ${textClassName}`}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

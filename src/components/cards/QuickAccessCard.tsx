import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface QuickAccessCardProps {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
}

// Card de acesso rapido com alvo de toque amplo (>= 48px) e alto contraste.
export function QuickAccessCard({
  label,
  subtitle,
  icon,
  onPress,
  accessibilityLabel,
  className = "",
}: QuickAccessCardProps) {
  const resolvedLabel =
    accessibilityLabel ?? (subtitle ? `${label}. ${subtitle}` : label);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      className={`min-h-[112px] justify-between rounded-2xl border border-line bg-white p-4 active:opacity-80 ${className}`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
        {icon}
      </View>

      <View className="mt-3 gap-0.5">
        <Text className="text-base font-bold leading-snug text-brand-dark">
          {label}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} className="text-xs leading-snug text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

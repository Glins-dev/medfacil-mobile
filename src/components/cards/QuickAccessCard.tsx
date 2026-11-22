import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

export interface QuickAccessCardProps {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  imageSource?: ImageSourcePropType;
  variant?: "white" | "cream";
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
}

// Card de acesso rapido com alvo de toque amplo (>= 48px), suporte a imagem 3D e alto contraste.
export function QuickAccessCard({
  label,
  subtitle,
  icon,
  imageSource,
  variant = "white",
  onPress,
  accessibilityLabel,
  className = "",
}: QuickAccessCardProps) {
  const resolvedLabel =
    accessibilityLabel ?? (subtitle ? `${label}. ${subtitle}` : label);

  if (variant === "cream") {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}
        className={`min-h-[136px] items-center justify-between rounded-2xl border border-line bg-surface p-4 active:opacity-80 ${className}`}
      >
        <View className="h-16 w-full items-center justify-center">
          {imageSource ? (
            <Image
              source={imageSource}
              resizeMode="contain"
              className="h-16 w-16"
            />
          ) : (
            icon
          )}
        </View>

        <Text className="mt-2 text-center text-base font-bold leading-snug text-brand-dark">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      className={`min-h-[112px] justify-between rounded-2xl border border-line bg-white p-4 active:opacity-80 ${className}`}
    >
      {imageSource ? (
        <Image source={imageSource} resizeMode="contain" className="h-12 w-12" />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
          {icon}
        </View>
      )}

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

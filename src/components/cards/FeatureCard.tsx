import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  imageSource?: ImageSourcePropType;
  highlighted?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#0e706f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

// Cartao horizontal de funcionalidade para a lista vertical da Home do paciente.
export function FeatureCard({
  title,
  description,
  icon,
  imageSource,
  highlighted = false,
  onPress,
  accessibilityLabel,
  className = "",
}: FeatureCardProps) {
  const resolvedLabel = accessibilityLabel ?? `${title}. ${description}`;
  const borderClass = highlighted
    ? "border-2 border-[#0e706f]"
    : "border border-transparent";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      style={styles.shadow}
      className={`min-h-[88px] w-full flex-row items-center gap-4 rounded-2xl bg-[#dbf0ef] p-3.5 active:opacity-85 ${borderClass} ${className}`}
    >
      <View className="h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white">
        {imageSource ? (
          <Image
            source={imageSource}
            resizeMode="contain"
            style={{ width: 56, height: 56 }}
            className="h-14 w-14"
          />
        ) : (
          icon
        )}
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-slate-900">{title}</Text>
        <Text className="text-sm leading-snug text-slate-600">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

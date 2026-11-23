import type { ReactNode } from "react";
import {
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { BrandLogo } from "./BrandLogo";

export interface AppScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
  icon?: ReactNode;
  imageSource?: ImageSourcePropType;
  rightTopSlot?: ReactNode;
  badge?: ReactNode;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
});

function ArrowLeftTealIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

// Cabecalho padronizado das telas do app com fundo verde-agua e area segura superior.
export function AppScreenHeader({
  title,
  subtitle,
  onBackPress,
  backAccessibilityLabel = "Voltar",
  icon,
  imageSource,
  rightTopSlot,
  badge,
}: AppScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0)
        : 0;

  return (
    <LinearGradient
      colors={["#c6eceb", "#dcf4f2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: topInset + 12 }]}
    >
      <View className="min-h-[48px] flex-row items-center justify-between gap-3">
        {onBackPress ? (
          <Pressable
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white active:opacity-80"
          >
            <ArrowLeftTealIcon />
          </Pressable>
        ) : (
          <View className="min-h-[48px] min-w-[48px]" />
        )}

        <View className="flex-row items-center gap-2.5">
          {badge}
          {rightTopSlot}
          <BrandLogo height={26} />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1 pr-3">
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold leading-tight text-[#004959]"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm font-medium text-[#0e706f]">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {imageSource || icon ? (
          <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
            {imageSource ? (
              <Image
                source={imageSource}
                resizeMode="contain"
                style={{ width: 40, height: 40 }}
              />
            ) : (
              icon
            )}
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

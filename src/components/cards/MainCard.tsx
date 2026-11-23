import {
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export interface MainCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  imageSource?: ImageSourcePropType;
  imageAlt?: string;
  className?: string;
}

// Card principal da marca com gradiente e botao ou area de toque acessivel.
export function MainCard({
  title,
  description,
  actionLabel,
  onAction,
  imageSource,
  imageAlt = "",
  className = "",
}: MainCardProps) {
  const hasCardPressOnly = Boolean(onAction && !actionLabel);

  const innerContent = (
    <LinearGradient
      colors={["#0e706f", "#29a4b4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        overflow: "hidden",
        padding: 20,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 items-start gap-1">
          <Text className="text-2xl font-bold leading-tight text-white">
            {title}
          </Text>
          <Text className="text-sm leading-snug text-white">
            {description}
          </Text>

          {actionLabel ? (
            <Pressable
              onPress={onAction}
              disabled={!onAction}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              className="mt-4 min-h-[48px] items-center justify-center rounded-full bg-[#F7C343] px-6 py-2.5 active:opacity-85"
            >
              <Text className="text-base font-bold text-brand-dark">
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {imageSource ? (
          <Image
            source={imageSource}
            resizeMode="contain"
            accessibilityLabel={imageAlt || undefined}
            accessible={Boolean(imageAlt)}
            className="h-28 w-24 shrink-0"
          />
        ) : null}
      </View>
    </LinearGradient>
  );

  if (hasCardPressOnly) {
    return (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
        className={`rounded-3xl active:opacity-90 ${className}`}
      >
        {innerContent}
      </Pressable>
    );
  }

  return <View className={`rounded-3xl ${className}`}>{innerContent}</View>;
}

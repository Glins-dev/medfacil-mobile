import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface DateBadgeProps {
  day: string | number;
  month: string;
}

// Selo amarelo de data (ex.: 18 OUT) usado como destaque lateral no NoticeCard.
export function DateBadge({ day, month }: DateBadgeProps) {
  return (
    <View className="h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent">
      <Text className="text-2xl font-bold leading-none text-brand-dark">
        {day}
      </Text>
      <Text className="mt-0.5 text-xs font-bold uppercase leading-none text-brand-dark">
        {month}
      </Text>
    </View>
  );
}

export interface NoticeCardProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  detail?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
}

// Card informativo de alto contraste com suporte opcional a toque acessivel.
export function NoticeCard({
  leading,
  title,
  subtitle,
  detail,
  onPress,
  accessibilityLabel,
  className = "",
}: NoticeCardProps) {
  const baseClass =
    "min-h-[72px] w-full flex-row items-center gap-4 rounded-2xl border border-line bg-white p-4";

  const content = (
    <>
      {leading}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-lg font-bold text-ink">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="text-sm text-muted">
            {subtitle}
          </Text>
        ) : null}
        {detail ? (
          <Text
            numberOfLines={1}
            className="mt-1 text-sm font-semibold text-brand"
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    const resolvedLabel =
      accessibilityLabel ??
      [title, subtitle, detail].filter(Boolean).join(", ");

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}
        className={`${baseClass} active:opacity-85 ${className}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View className={`${baseClass} ${className}`}>{content}</View>;
}

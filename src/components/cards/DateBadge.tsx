import { Text, View } from "react-native";

export interface DateBadgeProps {
  day: string | number;
  month: string;
  className?: string;
}

// Selo amarelo de data (ex.: 18 OUT) usado como destaque lateral em cards de consulta.
export function DateBadge({ day, month, className = "" }: DateBadgeProps) {
  return (
    <View
      className={`h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F7C343] ${className}`}
    >
      <Text className="text-2xl font-bold leading-none text-brand-dark">
        {day}
      </Text>
      <Text className="mt-0.5 text-xs font-bold uppercase leading-none text-brand-dark">
        {month}
      </Text>
    </View>
  );
}

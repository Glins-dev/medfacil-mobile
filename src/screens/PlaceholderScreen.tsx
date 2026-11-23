import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreenHeader } from "@/components";

export interface PlaceholderScreenOptions {
  subtitle?: string;
  icon?: ReactNode;
}

// Tela provisoria das abas ainda nao implementadas no padrao visual do app.
export function createPlaceholderScreen(
  title: string,
  options?: PlaceholderScreenOptions
) {
  return function PlaceholderScreen() {
    const insets = useSafeAreaInsets();
    const scrollBottomPadding = 104 + insets.bottom;

    return (
      <View className="flex-1 bg-[#f8fbfb]">
        <AppScreenHeader
          title={title}
          subtitle={options?.subtitle ?? "Em breve disponível no aplicativo."}
          icon={options?.icon}
        />

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-4 px-5 pt-6"
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        >
          <View className="gap-2 rounded-2xl border border-[#e6ecee] bg-white p-5">
            <Text className="text-lg font-bold text-[#004959]">
              Funcionalidade em desenvolvimento
            </Text>
            <Text className="text-sm leading-relaxed text-[#6b7280]">
              Esta tela será disponibilizada nas próximas atualizações do
              Medfácil.
            </Text>
          </View>

          <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
            <Text className="text-sm font-bold text-[#004959]">
              Acompanhe suas consultas pela aba Início enquanto concluímos este
              módulo.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };
}

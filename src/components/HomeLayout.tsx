import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";

interface HomeLayoutProps {
  roleLabel: string;
  subtitle: string;
  children?: ReactNode;
}

/** Estrutura comum das Homes de cada perfil (saudação, cartão de perfil e logout). */
export function HomeLayout({ roleLabel, subtitle, children }: HomeLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-surface">
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text accessibilityRole="header" className="text-3xl font-bold text-ink">
            Olá{firstName ? `, ${firstName}` : ""}
          </Text>
          <Text className="mt-1 text-base text-muted">{subtitle}</Text>
        </View>

        <LinearGradient
          colors={["#0e706f", "#29a4b4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 20 }}
        >
          <Text className="text-sm font-medium text-white">Perfil</Text>
          <Text className="text-2xl font-bold text-white">{roleLabel}</Text>
          <Text className="mt-1 text-sm text-white">{user?.email}</Text>
        </LinearGradient>

        {children}

        <Button label="Sair" variant="secondary" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

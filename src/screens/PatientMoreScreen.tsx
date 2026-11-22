import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { Button, Modal, NoticeCard } from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientTabParamList } from "@/navigation/types";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { MEDICAL_IMAGES } from "@/utils/specialtyIcons";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientMore">;

// Tela da aba Mais com atalhos do mockup, dados da unidade e saida da conta.
export function PatientMoreScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Logout local ocorre independentemente da resposta do servidor.
    } finally {
      logout();
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow gap-6 px-5 pb-8 pt-3">
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Mais opções
          </Text>
          <Text className="text-lg font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>
        </View>

        {user ? (
          <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
            <Text className="text-base font-bold text-brand-dark">
              {user.name}
            </Text>
            <Text className="text-sm text-muted">{user.email}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="text-lg font-bold text-ink">Saúde e documentos</Text>

          <NoticeCard
            leading={
              <Image
                source={MEDICAL_IMAGES.prescription}
                resizeMode="contain"
                className="h-12 w-12"
              />
            }
            title="Minhas receitas"
            subtitle="Visualize prescrições e orientações médicas"
            detail="Em breve"
            onPress={() => setComingSoonTitle("Minhas receitas")}
          />

          <NoticeCard
            leading={
              <Image
                source={MEDICAL_IMAGES.heart}
                resizeMode="contain"
                className="h-12 w-12"
              />
            }
            title="Minha saúde"
            subtitle="Histórico clínico e acompanhamentos"
            detail="Em breve"
            onPress={() => setComingSoonTitle("Minha saúde")}
          />
        </View>

        <View className="gap-3">
          <Text className="text-lg font-bold text-ink">Atendimento</Text>

          <NoticeCard
            leading={
              <Image
                source={MEDICAL_IMAGES.stethoscope}
                resizeMode="contain"
                className="h-12 w-12"
              />
            }
            title={CLINIC_INFO.name}
            subtitle={CLINIC_INFO.address}
            detail="Agendar nova consulta"
            onPress={() => navigation.navigate("PatientSchedule")}
          />
        </View>

        <View className="mt-auto pt-4">
          <Button
            label={loggingOut ? "Saindo..." : "Sair da conta"}
            variant="outline"
            loading={loggingOut}
            onPress={() => {
              void handleLogout();
            }}
          />
        </View>
      </ScrollView>

      <Modal
        open={Boolean(comingSoonTitle)}
        onClose={() => setComingSoonTitle(null)}
        title={comingSoonTitle ?? "Funcionalidade em breve"}
        closeLabel="Fechar aviso"
      >
        <View className="gap-4">
          <Text className="text-base text-ink">
            Funcionalidade em breve. Estamos preparando esta área para você
            acompanhar seus dados com segurança.
          </Text>
          <Pressable
            onPress={() => setComingSoonTitle(null)}
            accessibilityRole="button"
            accessibilityLabel="Entendi"
            className="min-h-[48px] items-center justify-center rounded-xl bg-brand px-6 active:opacity-85"
          >
            <Text className="text-base font-semibold text-white">Entendi</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

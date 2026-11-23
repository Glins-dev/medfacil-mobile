import { useState } from "react";
import { Platform, ScrollView, StatusBar, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { Button } from "@/components/ui";
import type { PatientTabParamList } from "@/navigation/types";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { calculateAge } from "@/utils/date";
import { maskCpf } from "@/utils/masks";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientProfile">;

function getInitials(name?: string | null): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProfileFieldRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`gap-1 py-3.5 ${isLast ? "" : "border-b border-line/70"}`}
    >
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <Text className="text-base font-bold text-ink">{value}</Text>
    </View>
  );
}

// Tela de perfil do paciente exibindo dados basicos e opcao acessivel de sair.
export function PatientProfileScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;
  const scrollBottomPadding = 104 + insets.bottom;

  const fullName = user?.name?.trim() || "Não informado";
  const age = calculateAge(user?.birthDate ?? user?.dataNascimento);
  const ageLabel =
    age !== null ? `${age} ${age === 1 ? "ano" : "anos"}` : "Não informada";
  const formattedCpf = user?.cpf ? maskCpf(user.cpf) : "Não informado";
  const registrationNumber =
    user?.matricula?.trim() ||
    user?.registrationNumber?.trim() ||
    user?.patientCode?.trim() ||
    "Não informada";

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
      <ScrollView
        contentContainerClassName="flex-grow gap-6 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
      >
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Perfil
          </Text>
          <Text className="text-lg font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>
        </View>

        <View className="flex-row items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
            <Text className="text-lg font-bold text-white">
              {getInitials(user?.name)}
            </Text>
          </View>

          <View className="min-w-0 flex-1 gap-0.5">
            <Text numberOfLines={1} className="text-lg font-bold text-brand-dark">
              {fullName}
            </Text>
            {user?.email ? (
              <Text numberOfLines={1} className="text-sm text-muted">
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-lg font-bold text-ink">Dados do paciente</Text>

          <View className="rounded-2xl border border-line bg-white px-4 py-1">
            <ProfileFieldRow label="Nome completo" value={fullName} />
            <ProfileFieldRow label="Idade" value={ageLabel} />
            <ProfileFieldRow label="CPF" value={formattedCpf} />
            <ProfileFieldRow
              label="Número de matrícula"
              value={registrationNumber}
              isLast
            />
          </View>
        </View>

        <View className="mt-auto pt-2">
          <Button
            label={loggingOut ? "Saindo..." : "Sair"}
            variant="outline"
            accessibilityLabel="Sair da conta"
            loading={loggingOut}
            onPress={() => {
              void handleLogout();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

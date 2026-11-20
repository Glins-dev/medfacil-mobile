import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Path } from "react-native-svg";

import {
  Button,
  MainCard,
  NoticeCard,
  QuickAccessCard,
} from "@/components";
import { NewSpecialtyModal } from "@/components/modals/NewSpecialtyModal";
import type { AdminTabParamList } from "@/navigation/types";
import { adminService, type AdminSpecialty } from "@/services/admin.service";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

type Props = BottomTabScreenProps<AdminTabParamList, "AdminHome">;
type LoadStatus = "loading" | "ready" | "error";

const byName = (a: AdminSpecialty, b: AdminSpecialty) =>
  a.name.localeCompare(b.name, "pt-BR");

function SpecialtiesIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

function DoctorPlusIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <Path d="M5 3h2M13 3h2" />
      <Path d="M10 13v1.5a4.5 4.5 0 0 0 9 0V13" />
      <Circle cx="19" cy="11" r="2" />
    </Svg>
  );
}

// Tela inicial do administrador com gestao de especialidades e atalho para medicos.
export function AdminHomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const loadSpecialties = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setStatus("loading");
    }
    setErrorMessage("");
    try {
      const items = await adminService.listSpecialties();
      setSpecialties([...items].sort(byName));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Não foi possível carregar as especialidades.")
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const items = await adminService.listSpecialties();
        if (!active) return;
        setSpecialties([...items].sort(byName));
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Não foi possível carregar as especialidades."
          )
        );
        setStatus("error");
      }
    };

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSpecialties(true);
    } finally {
      setRefreshing(false);
    }
  };

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

  const handleSpecialtyCreated = (created: AdminSpecialty) => {
    setSpecialties((current) =>
      [...current.filter((item) => item.id !== created.id), created].sort(
        byName
      )
    );
    setStatus("ready");
    setNotice(`Especialidade "${created.name}" cadastrada.`);
  };

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-brand-cream"
    >
      <ScrollView
        contentContainerClassName="flex-grow gap-6 px-5 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor="#0e706f"
            colors={["#0e706f"]}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              void handleLogout();
            }}
            disabled={loggingOut}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
            className="min-h-[48px] min-w-[48px] justify-center rounded-lg px-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand underline">
              {loggingOut ? "Saindo..." : "Sair"}
            </Text>
          </Pressable>

          <Text className="text-lg font-bold tracking-tight text-brand-dark">
            Med<Text className="font-semibold italic text-brand">fácil</Text>
          </Text>
        </View>

        <View className="gap-0.5">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink"
          >
            Olá{firstName ? `, ${firstName}` : ""}
          </Text>
          <Text className="text-base font-medium text-brand-dark">
            Painel administrativo
          </Text>
          {user?.email ? (
            <Text className="text-sm text-muted">{user.email}</Text>
          ) : null}
        </View>

        <MainCard
          title="Cadastrar médico"
          description="Crie o acesso profissional com CRM e especialidades vinculadas."
          actionLabel="Novo médico"
          onAction={() => navigation.navigate("AdminDoctors")}
        />

        <View className="gap-3">
          <Text className="text-xl font-bold text-ink">Acesso rápido</Text>

          <View className="flex-row gap-3">
            <QuickAccessCard
              className="flex-1"
              label="Especialidades"
              subtitle="Listar e criar novas"
              icon={<SpecialtiesIcon />}
              onPress={() => setSpecialtyModalOpen(true)}
            />
            <QuickAccessCard
              className="flex-1"
              label="Novo médico"
              subtitle="Vincular CRM e áreas"
              icon={<DoctorPlusIcon />}
              onPress={() => navigation.navigate("AdminDoctors")}
            />
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-xl font-bold text-ink">
              Especialidades
              {status === "ready" ? ` (${specialties.length})` : ""}
            </Text>
            <Pressable
              onPress={() => setSpecialtyModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Adicionar especialidade"
              className="min-h-[48px] justify-center px-2 active:opacity-70"
            >
              <Text className="text-sm font-bold text-brand underline">
                + Nova
              </Text>
            </Pressable>
          </View>

          {notice ? (
            <View
              accessibilityRole="alert"
              className="rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3"
            >
              <Text className="text-sm font-semibold text-brand-dark">
                {notice}
              </Text>
            </View>
          ) : null}

          {status === "loading" ? (
            <View className="min-h-[100px] items-center justify-center gap-2 rounded-2xl border border-line bg-white p-6">
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-muted">
                Carregando especialidades...
              </Text>
            </View>
          ) : null}

          {status === "error" ? (
            <View className="gap-3 rounded-2xl border border-line bg-white p-5">
              <Text className="text-sm font-medium text-ink">
                {errorMessage || "Não foi possível carregar as especialidades."}
              </Text>
              <Button
                label="Tentar novamente"
                variant="outline"
                onPress={() => {
                  void loadSpecialties();
                }}
              />
            </View>
          ) : null}

          {status === "ready" && specialties.length === 0 ? (
            <NoticeCard
              title="Nenhuma especialidade cadastrada"
              subtitle="Crie a primeira especialidade para cadastrar médicos."
              detail="Toque para adicionar"
              onPress={() => setSpecialtyModalOpen(true)}
            />
          ) : null}

          {status === "ready" && specialties.length > 0 ? (
            <View className="gap-2.5">
              {specialties.map((item) => (
                <NoticeCard
                  key={item.id}
                  title={item.name}
                  subtitle={item.description ?? "Sem descrição"}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <NewSpecialtyModal
        open={specialtyModalOpen}
        onClose={() => setSpecialtyModalOpen(false)}
        onCreated={handleSpecialtyCreated}
      />
    </SafeAreaView>
  );
}

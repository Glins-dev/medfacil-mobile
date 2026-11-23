import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import {
  AppScreenHeader,
  Button,
  MainCard,
  Modal,
  QuickAccessCard,
} from "@/components";
import { NewSpecialtyModal } from "@/components/modals/NewSpecialtyModal";
import { BuildingHospitalIcon, CalendarIcon } from "@/navigation/icons";
import type { AdminTabParamList } from "@/navigation/types";
import { adminService, type AdminSpecialty } from "@/services/admin.service";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import type { AdminDoctor } from "@/types/admin";
import { getSpecialtyImage, MEDICAL_IMAGES } from "@/utils/specialtyIcons";

type Props = BottomTabScreenProps<AdminTabParamList, "AdminHome">;
type LoadStatus = "loading" | "ready" | "error";

const byName = (a: AdminSpecialty, b: AdminSpecialty) =>
  a.name.localeCompare(b.name, "pt-BR");

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#0e706f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

function AdminPanelIcon() {
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3.5" y="4" width="7.5" height="7.5" rx="2" />
      <Rect x="13" y="4" width="7.5" height="7.5" rx="2" />
      <Rect x="3.5" y="13.5" width="7.5" height="6.5" rx="2" />
      <Rect x="13" y="13.5" width="7.5" height="6.5" rx="2" />
    </Svg>
  );
}

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

// Painel administrativo com gestao de especialidades, medicos, hospitais e horarios.
export function AdminHomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const doctors = useAdminStore((s) => s.doctors);
  const hospitals = useAdminStore((s) => s.hospitals);

  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<AdminDoctor | null>(
    null
  );
  const [deletingDoctor, setDeletingDoctor] = useState(false);
  const [notice, setNotice] = useState("");

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = 104 + insets.bottom;

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setStatus("loading");
    }
    setErrorMessage("");
    try {
      const items = await adminService.listSpecialties();
      const sorted = [...items].sort(byName);
      setSpecialties(sorted);
      setStatus("ready");
      await adminService.listDoctors(sorted);
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
        const sorted = [...items].sort(byName);
        setSpecialties(sorted);
        setStatus("ready");
        await adminService.listDoctors(sorted);
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
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard(true);
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

  const handleConfirmDeleteDoctor = async () => {
    if (!doctorToDelete || deletingDoctor) return;
    setDeletingDoctor(true);
    try {
      const removedName = doctorToDelete.name;
      await adminService.deleteDoctor(doctorToDelete.id);
      setDoctorToDelete(null);
      setNotice(
        `Médico ${removedName} removido junto com vínculos e horários associados.`
      );
    } finally {
      setDeletingDoctor(false);
    }
  };

  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title={firstName ? `Olá, ${firstName}` : "Painel Administrativo"}
        subtitle="Gestão de especialidades, médicos, hospitais e horários."
        icon={<AdminPanelIcon />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-6 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
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
        <MainCard
          title="Cadastrar médico"
          description="Crie o acesso profissional com CRM e especialidades vinculadas."
          actionLabel="Novo médico"
          imageSource={MEDICAL_IMAGES.doctor}
          imageAlt="Ilustração de profissional médico"
          onAction={() => navigation.navigate("AdminDoctors")}
        />

        {notice ? (
          <View
            accessibilityRole="alert"
            className="rounded-2xl border border-[#0e706f]/30 bg-[#dbf0ef] px-4 py-3.5"
          >
            <Text className="text-sm font-semibold text-[#004959]">
              {notice}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="text-xl font-bold text-[#004959]">
            Acesso rápido
          </Text>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <QuickAccessCard
                className="flex-1 border-[#e6ecee]"
                label="Especialidades"
                subtitle="Listar e criar novas"
                icon={<SpecialtiesIcon />}
                onPress={() => setSpecialtyModalOpen(true)}
              />
              <QuickAccessCard
                className="flex-1 border-[#e6ecee]"
                label="Novo médico"
                subtitle="Vincular CRM e áreas"
                icon={<DoctorPlusIcon />}
                onPress={() => navigation.navigate("AdminDoctors")}
              />
            </View>

            <View className="flex-row gap-3">
              <QuickAccessCard
                className="flex-1 border-[#e6ecee]"
                label="Hospitais"
                subtitle="Unidades e vínculos"
                icon={<BuildingHospitalIcon color="#0e706f" size={24} />}
                onPress={() => navigation.navigate("AdminHospitals")}
              />
              <QuickAccessCard
                className="flex-1 border-[#e6ecee]"
                label="Horários"
                subtitle="Agenda dos médicos"
                icon={<CalendarIcon color="#0e706f" size={24} />}
                onPress={() => navigation.navigate("AdminSchedules")}
              />
            </View>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-[#004959]">
                Médicos cadastrados
              </Text>
              <View className="rounded-full bg-[#dbf0ef] px-2.5 py-0.5">
                <Text className="text-xs font-bold text-[#004959]">
                  {doctors.length}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation.navigate("AdminDoctors")}
              accessibilityRole="button"
              accessibilityLabel="Cadastrar novo médico"
              className="min-h-[48px] items-center justify-center rounded-xl border border-[#0e706f] bg-white px-4 active:opacity-80"
            >
              <Text className="text-sm font-bold text-[#0e706f]">+ Novo</Text>
            </Pressable>
          </View>

          {status === "loading" && doctors.length === 0 ? (
            <View
              style={styles.cardShadow}
              className="min-h-[100px] items-center justify-center gap-2 rounded-2xl border border-[#e6ecee] bg-white p-6"
            >
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-[#6b7280]">
                Carregando médicos...
              </Text>
            </View>
          ) : doctors.length === 0 ? (
            <View className="gap-2 rounded-2xl border border-[#e6ecee] bg-white p-4">
              <Text className="text-base font-bold text-[#004959]">
                Nenhum médico cadastrado
              </Text>
              <Text className="text-sm text-[#6b7280]">
                Cadastre um profissional para gerenciar hospitais e horários.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {doctors.map((doctor) => {
                const linkedHospitals = hospitals
                  .filter((hosp) => hosp.doctorIds.includes(doctor.id))
                  .map((hosp) => hosp.name);

                return (
                  <View
                    key={doctor.id}
                    style={styles.cardShadow}
                    className="gap-3 rounded-2xl border border-[#e6ecee] bg-white p-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <Text
                          numberOfLines={1}
                          className="text-base font-bold text-[#004959]"
                        >
                          {doctor.name}
                        </Text>
                        <Text className="text-xs font-semibold text-[#0e706f]">
                          CRM {doctor.crm}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => setDoctorToDelete(doctor)}
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir médico ${doctor.name}`}
                        className="min-h-[48px] items-center justify-center rounded-xl border border-danger bg-white px-4 active:opacity-80"
                      >
                        <Text className="text-sm font-bold text-danger">
                          Excluir
                        </Text>
                      </Pressable>
                    </View>

                    {doctor.specialtyNames.length > 0 ? (
                      <View className="flex-row flex-wrap gap-1.5">
                        {doctor.specialtyNames.map((specName) => (
                          <View
                            key={`${doctor.id}-${specName}`}
                            className="rounded-full bg-[#dbf0ef] px-2.5 py-1"
                          >
                            <Text className="text-xs font-bold text-[#004959]">
                              {specName}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text className="text-xs text-[#6b7280]">
                      {linkedHospitals.length > 0
                        ? `Hospitais: ${linkedHospitals.join(", ")}`
                        : "Nenhum hospital vinculado"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-[#004959]">
                Especialidades médicas
              </Text>
              {status === "ready" ? (
                <View className="rounded-full bg-[#dbf0ef] px-2.5 py-0.5">
                  <Text className="text-xs font-bold text-[#004959]">
                    {specialties.length}
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => setSpecialtyModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Adicionar especialidade"
              className="min-h-[48px] items-center justify-center rounded-xl border border-[#0e706f] bg-white px-4 active:opacity-80"
            >
              <Text className="text-sm font-bold text-[#0e706f]">+ Nova</Text>
            </Pressable>
          </View>

          {status === "loading" ? (
            <View
              style={styles.cardShadow}
              className="min-h-[100px] items-center justify-center gap-2 rounded-2xl border border-[#e6ecee] bg-white p-6"
            >
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-[#6b7280]">
                Carregando especialidades...
              </Text>
            </View>
          ) : null}

          {status === "error" ? (
            <View
              style={styles.cardShadow}
              className="gap-3 rounded-2xl border border-[#e6ecee] bg-white p-5"
            >
              <Text className="text-sm font-semibold text-[#004959]">
                {errorMessage || "Não foi possível carregar as especialidades."}
              </Text>
              <Button
                label="Tentar novamente"
                variant="outline"
                onPress={() => {
                  void loadDashboard();
                }}
              />
            </View>
          ) : null}

          {status === "ready" && specialties.length === 0 ? (
            <Pressable
              onPress={() => setSpecialtyModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Nenhuma especialidade cadastrada. Toque para adicionar"
              className="min-h-[72px] gap-1 rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4 active:opacity-85"
            >
              <Text className="text-base font-bold text-[#004959]">
                Nenhuma especialidade cadastrada
              </Text>
              <Text className="text-sm text-[#004959]/90">
                Toque aqui para criar a primeira especialidade e liberar o
                cadastro de médicos.
              </Text>
            </Pressable>
          ) : null}

          {status === "ready" && specialties.length > 0 ? (
            <View className="gap-2.5">
              {specialties.map((item) => (
                <View
                  key={item.id}
                  style={styles.cardShadow}
                  className="min-h-[72px] flex-row items-center gap-3.5 rounded-2xl border border-[#e6ecee] bg-white p-4"
                >
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f6f8f9]">
                    <Image
                      source={getSpecialtyImage(item.name)}
                      resizeMode="contain"
                      style={{ width: 32, height: 32 }}
                    />
                  </View>

                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text
                      numberOfLines={1}
                      className="text-base font-bold text-[#004959]"
                    >
                      {item.name}
                    </Text>
                    <Text numberOfLines={2} className="text-sm text-[#6b7280]">
                      {item.description ?? "Sem descrição cadastrada"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="mt-auto gap-3 pt-2">
          {user?.email ? (
            <View className="rounded-2xl border border-[#e6ecee] bg-[#f6f8f9] px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Conta administrativa
              </Text>
              <Text className="mt-0.5 text-sm font-bold text-[#004959]">
                {user.email}
              </Text>
            </View>
          ) : null}

          <Button
            label={loggingOut ? "Saindo..." : "Sair da conta"}
            variant="danger-outline"
            disabled={loggingOut}
            accessibilityLabel="Sair da conta"
            onPress={() => {
              void handleLogout();
            }}
          />
        </View>
      </ScrollView>

      <NewSpecialtyModal
        open={specialtyModalOpen}
        onClose={() => setSpecialtyModalOpen(false)}
        onCreated={handleSpecialtyCreated}
      />

      <Modal
        open={Boolean(doctorToDelete)}
        onClose={deletingDoctor ? () => {} : () => setDoctorToDelete(null)}
        title="Excluir médico"
        closeLabel="Cancelar exclusão de médico"
      >
        {doctorToDelete ? (
          <View className="gap-4">
            <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
              <Text className="text-base font-bold text-[#004959]">
                {doctorToDelete.name} (CRM {doctorToDelete.crm})
              </Text>
              <Text className="mt-1 text-sm text-[#004959]">
                Ao confirmar a exclusão, todos os vínculos com hospitais e
                horários cadastrados para este profissional serão removidos.
              </Text>
            </View>

            <View className="gap-2.5">
              <Button
                label={deletingDoctor ? "Excluindo..." : "Confirmar exclusão"}
                variant="danger"
                loading={deletingDoctor}
                onPress={() => {
                  void handleConfirmDeleteDoctor();
                }}
              />
              <Button
                label="Cancelar"
                variant="outline"
                disabled={deletingDoctor}
                onPress={() => setDoctorToDelete(null)}
              />
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

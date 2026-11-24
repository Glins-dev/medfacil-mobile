import { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Path } from "react-native-svg";

import {
  Button,
  FLOATING_TAB_BAR_SCROLL_OFFSET,
  Input,
  Modal,
  PatientScreenHeader,
} from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import { UserIcon } from "@/navigation/icons";
import type { PatientTabParamList } from "@/navigation/types";
import { authService } from "@/services/auth.service";
import { getApiErrorMessage } from "@/services/api";
import { saveLocalUserAddress, useAuthStore } from "@/stores/auth.store";
import { USER_SEX_OPTIONS, type UserSex } from "@/types/user";
import { calculateAge } from "@/utils/date";
import { maskCpf, maskPhone } from "@/utils/masks";
import { MEDICAL_IMAGES } from "@/utils/specialtyIcons";

type Props = BottomTabScreenProps<PatientTabParamList, "PatientProfile">;

type ProfileModalKey = "personal" | "notifications" | "accessibility" | "help";

function ChevronRightMutedIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#64748b"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

function AccessibilityIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="5.5" r="2" />
      <Path d="M5 9.5h14M12 9.5v5.5M9.5 20l2.5-5 2.5 5" />
    </Svg>
  );
}

function ShieldCheckIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 3 5 6v6c0 4.5 3 8.2 7 9.5 4-1.3 7-5 7-9.5V6l-7-3Z" />
      <Path d="m9 12.2 2.1 2.1 4-4" />
    </Svg>
  );
}

function ProfileOptionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      className="min-h-[64px] w-full flex-row items-center gap-3.5 rounded-2xl bg-[#f6f8f9] p-4 active:opacity-85"
    >
      <View className="h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
        {icon}
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-bold text-ink">{title}</Text>
        <Text numberOfLines={1} className="text-sm text-muted">
          {subtitle}
        </Text>
      </View>

      <ChevronRightMutedIcon />
    </Pressable>
  );
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
      className={`gap-1 py-3 ${isLast ? "" : "border-b border-line/70"}`}
    >
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <Text className="text-base font-bold text-ink">{value}</Text>
    </View>
  );
}

// Tela de perfil do paciente com cabecalho verde-agua, opcoes de conta e seguranca.
export function PatientProfileScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeModal, setActiveModal] = useState<ProfileModalKey | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [confirmAlertsEnabled, setConfirmAlertsEnabled] = useState(true);
  const [simpleModeEnabled, setSimpleModeEnabled] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "", email: "", phone: "", birthDate: "", sexo: "Não informar" as UserSex, endereco: "",
  });

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;

  const fullName = user?.name?.trim() || "Não informado";
  const age = calculateAge(user?.birthDate ?? user?.dataNascimento);
  const ageLabel =
    age !== null ? `${age} ${age === 1 ? "ano" : "anos"}` : "Não informada";
  const sexLabel = user?.sexo?.trim() || "Não informado";
  const addressLabel =
    user?.endereco?.trim() || user?.address?.trim() || "Não informado";
  const formattedCpf = user?.cpf ? maskCpf(user.cpf) : "Não informado";
  const registrationNumber =
    user?.matricula?.trim() ||
    user?.registrationNumber?.trim() ||
    user?.patientCode?.trim() ||
    "Não informada";

  useEffect(() => {
    let active = true;
    void authService.profile().then((profile) => {
      if (active) updateUser(profile);
    }).catch(() => {
      // Mantem os dados locais se a atualizacao estiver indisponivel.
    });
    return () => { active = false; };
  }, [updateUser]);

  const openPersonalData = () => {
    setProfileError("");
    setProfileForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: maskPhone(user?.phone ?? ""),
      birthDate: user?.birthDate ?? user?.dataNascimento ?? "",
      sexo: user?.sexo ?? "Não informar",
      endereco: user?.endereco ?? user?.address ?? "",
    });
    setActiveModal("personal");
  };

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await authService.updateProfile(profileForm);
      updateUser(updated);
      await saveLocalUserAddress({ userId: updated.id, cpf: updated.cpf, address: updated.endereco });
      setActiveModal(null);
    } catch (error) {
      setProfileError(getApiErrorMessage(error, "Não foi possível salvar seus dados."));
    } finally { setSavingProfile(false); }
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

  const modalTitles: Record<ProfileModalKey, string> = {
    personal: "Dados pessoais",
    notifications: "Notificações",
    accessibility: "Acessibilidade",
    help: "Ajuda",
  };

  return (
    <View className="flex-1 bg-white">
      <PatientScreenHeader
        title="Perfil"
        subtitle="Dados, preferências e ajuda."
        onLogoutPress={() => {
          void handleLogout();
        }}
        logoutDisabled={loggingOut}
        icon={<UserIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-4 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
      >
        <View className="gap-3">
            <ProfileOptionCard
              icon={<UserIcon color="#0e706f" size={24} />}
              title="Dados pessoais"
              subtitle={fullName}
              onPress={openPersonalData}
            />

            <ProfileOptionCard
              icon={<BellIcon />}
              title="Notificações"
              subtitle="Consultas e confirmações"
              onPress={() => setActiveModal("notifications")}
            />

            <ProfileOptionCard
              icon={<AccessibilityIcon />}
              title="Acessibilidade"
              subtitle="Tamanho do texto e Modo Simples"
              onPress={() => setActiveModal("accessibility")}
            />

            <ProfileOptionCard
              icon={
                <Image
                  source={MEDICAL_IMAGES.doctor}
                  resizeMode="contain"
                  style={{ width: 32, height: 32 }}
                />
              }
              title="Ajuda"
              subtitle="Fale com a equipe"
              onPress={() => setActiveModal("help")}
            />
          </View>

          <View className="flex-row items-center gap-3.5 rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80">
              <ShieldCheckIcon />
            </View>

            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-base font-bold text-[#004959]">
                Sua conta está protegida
              </Text>
              <Text className="text-sm text-[#004959]/90">
                Revise suas permissões quando precisar.
              </Text>
            </View>
          </View>
      </ScrollView>

      <Modal
        open={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        title={activeModal ? modalTitles[activeModal] : "Perfil"}
        closeLabel="Fechar"
        scrollable={activeModal === "personal"}
      >
        {activeModal === "personal" ? (
          <View className="gap-4">
            <View className="gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <Input label="Nome completo" value={profileForm.name} onChangeText={(name) => setProfileForm((s) => ({ ...s, name }))} />
              <Input label="E-mail" value={profileForm.email} onChangeText={(email) => setProfileForm((s) => ({ ...s, email }))} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Telefone" value={profileForm.phone} onChangeText={(phone) => setProfileForm((s) => ({ ...s, phone: maskPhone(phone) }))} keyboardType="phone-pad" />
              <Input
                label="Data de nascimento"
                value={profileForm.birthDate}
                editable={false}
                style={{ backgroundColor: "#d1d5db", color: "#374151", opacity: 1 }}
              />
              <View className="gap-2">
                <Text className="text-sm font-semibold text-[#004959]">Gênero</Text>
                <View className="gap-2">
                  {USER_SEX_OPTIONS.map((option) => (
                    <Pressable key={option} onPress={() => setProfileForm((s) => ({ ...s, sexo: option }))} accessibilityRole="radio" accessibilityState={{ selected: profileForm.sexo === option }} className={`min-h-[48px] justify-center rounded-xl border px-4 ${profileForm.sexo === option ? "border-brand bg-[#dff4f2]" : "border-line bg-white"}`}>
                      <Text className="text-base text-ink">{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Input label="Endereço" value={profileForm.endereco} onChangeText={(endereco) => setProfileForm((s) => ({ ...s, endereco }))} />
              <Input
                label="CPF"
                value={formattedCpf}
                editable={false}
                style={{ backgroundColor: "#d1d5db", color: "#374151", opacity: 1 }}
              />
            </View>
            {profileError ? <Text accessibilityRole="alert" className="text-sm font-medium text-danger">{profileError}</Text> : null}
            <Button label="Salvar alterações" loading={savingProfile} onPress={() => { void handleSaveProfile(); }} />
            <Button label="Cancelar" variant="outline" disabled={savingProfile} onPress={() => setActiveModal(null)} />
          </View>
        ) : null}

        {activeModal === "notifications" ? (
          <View className="gap-4">
            <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-ink">
                  Lembretes de consultas
                </Text>
                <Text className="text-xs text-muted">
                  Avisos próximos ao dia do atendimento.
                </Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                accessibilityLabel="Ativar lembretes de consultas"
                trackColor={{ false: "#cbd5e1", true: "#0e706f" }}
                thumbColor="#ffffff"
              />
            </View>

            <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-ink">
                  Confirmações com 48h
                </Text>
                <Text className="text-xs text-muted">
                  Solicitação rápida para confirmar presença.
                </Text>
              </View>
              <Switch
                value={confirmAlertsEnabled}
                onValueChange={setConfirmAlertsEnabled}
                accessibilityLabel="Ativar avisos de confirmação de presença"
                trackColor={{ false: "#cbd5e1", true: "#0e706f" }}
                thumbColor="#ffffff"
              />
            </View>

            <Button label="Salvar" onPress={() => setActiveModal(null)} />
          </View>
        ) : null}

        {activeModal === "accessibility" ? (
          <View className="gap-4">
            <View className="rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <Text className="text-sm leading-relaxed text-ink">
                O Medfácil acompanha automaticamente o tamanho da fonte definido
                nas configurações do seu aparelho, mantém contraste reforçado e
                áreas de toque com altura mínima de 48px.
              </Text>
            </View>

            <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-ink">
                  Modo Simples
                </Text>
                <Text className="text-xs text-muted">
                  Etapas guiadas e textos diretos durante o agendamento.
                </Text>
              </View>
              <Switch
                value={simpleModeEnabled}
                onValueChange={setSimpleModeEnabled}
                accessibilityLabel="Alternar Modo Simples"
                trackColor={{ false: "#cbd5e1", true: "#0e706f" }}
                thumbColor="#ffffff"
              />
            </View>

            <Button label="Entendi" onPress={() => setActiveModal(null)} />
          </View>
        ) : null}

        {activeModal === "help" ? (
          <View className="gap-4">
            <View className="gap-1.5 rounded-2xl border border-line bg-[#f6f8f9] p-4">
              <Text className="text-base font-bold text-brand-dark">
                {CLINIC_INFO.name}
              </Text>
              <Text className="text-sm font-medium text-ink">
                {CLINIC_INFO.unitLabel} · {CLINIC_INFO.address}
              </Text>
              <Text className="mt-1 text-sm text-muted">
                Atendimento da recepção de segunda a sexta, das 07:00 às 19:00,
                e aos sábados das 07:00 às 13:00.
              </Text>
            </View>

            <Button label="Fechar" onPress={() => setActiveModal(null)} />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";

import {
  AppScreenHeader,
  Button,
  getFieldFrameStyles,
  Input,
  Modal,
} from "@/components";
import { NewSpecialtyModal } from "@/components/modals/NewSpecialtyModal";
import { StethoscopeIcon } from "@/navigation/icons";
import type { AdminTabParamList } from "@/navigation/types";
import {
  createDoctorSchema,
  type CreateDoctorFormData,
} from "@/schemas/admin.schema";
import {
  adminService,
  type AdminSpecialty,
  type CreatedDoctor,
} from "@/services/admin.service";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import { maskCpf, onlyDigits } from "@/utils/cpf";
import { maskCrm, maskPhone } from "@/utils/masks";
import { getSpecialtyImage } from "@/utils/specialtyIcons";

type Props = BottomTabScreenProps<AdminTabParamList, "AdminDoctors">;
type SpecLoadStatus = "loading" | "ready" | "error";

const CHECK_ICON =
  require("../../assets/icons/check-icon.png") as ImageSourcePropType;

const bySpecialtyName = (a: AdminSpecialty, b: AdminSpecialty) =>
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

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

// Formulario administrativo de cadastro de medicos com CRM e especialidades.
export function AdminNewDoctorScreen({ navigation }: Props) {
  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [specStatus, setSpecStatus] = useState<SpecLoadStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createdDoctor, setCreatedDoctor] = useState<CreatedDoctor | null>(
    null
  );

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = 104 + insets.bottom;

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateDoctorFormData>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      phone: "",
      crm: "",
      password: "",
      specialtyIds: [],
    },
  });

  useEffect(() => {
    let cancelled = false;
    setSpecStatus("loading");

    adminService
      .listSpecialties()
      .then((items) => {
        if (cancelled) return;
        setSpecialties([...items].sort(bySpecialtyName));
        setSpecStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setSpecStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleSpecialtyCreated = useCallback(
    (created: AdminSpecialty) => {
      setSpecialties((current) =>
        [
          ...current.filter((item) => item.id !== created.id),
          created,
        ].sort(bySpecialtyName)
      );
      const currentIds = getValues("specialtyIds");
      if (!currentIds.includes(created.id)) {
        setValue("specialtyIds", [...currentIds, created.id], {
          shouldValidate: true,
        });
      }
      clearErrors("specialtyIds");
      if (specStatus !== "ready") {
        setReloadKey((k) => k + 1);
      }
    },
    [clearErrors, getValues, setValue, specStatus]
  );

  const onSubmit = async (data: CreateDoctorFormData) => {
    clearErrors("root");
    try {
      const doctor = await adminService.createDoctor({
        name: data.name.trim(),
        email: data.email.trim(),
        cpf: onlyDigits(data.cpf),
        phone: onlyDigits(data.phone),
        crm: data.crm.trim().toUpperCase(),
        password: data.password,
        specialtyIds: data.specialtyIds,
      });
      setCreatedDoctor(doctor);
      reset({
        name: "",
        email: "",
        cpf: "",
        phone: "",
        crm: "",
        password: "",
        specialtyIds: [],
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Não foi possível cadastrar o médico."
      );
      const status = getApiErrorStatus(err);

      if (status === 409 && message.startsWith("CPF já")) {
        setError("cpf", { message });
      } else if (status === 409 && message.startsWith("E-mail já")) {
        setError("email", { message });
      } else if (status === 409 && message.startsWith("CRM já")) {
        setError("crm", { message });
      } else if (status === 400) {
        setError("specialtyIds", { message });
        setReloadKey((k) => k + 1);
      } else {
        setError("root", { message });
      }
    }
  };

  const handleRegisterAnother = () => {
    setCreatedDoctor(null);
    clearErrors();
  };

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Cadastrar médico"
        subtitle="Crie o acesso profissional e vincule as especialidades."
        onBackPress={() => navigation.navigate("AdminHome")}
        backAccessibilityLabel="Voltar para o início"
        icon={<StethoscopeIcon color="#0e706f" size={28} />}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-5 px-5 pt-6"
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          keyboardShouldPersistTaps="handled"
        >
          {createdDoctor ? (
            <View className="gap-5">
              <View
                style={styles.cardShadow}
                className="items-center gap-4 rounded-3xl border border-[#e6ecee] bg-white p-6"
              >
                <Image
                  source={CHECK_ICON}
                  resizeMode="contain"
                  style={{ width: 64, height: 64 }}
                />

                <Text
                  accessibilityRole="header"
                  className="text-center text-2xl font-bold text-[#004959]"
                >
                  Médico cadastrado
                </Text>

                <View className="w-full gap-1.5 rounded-2xl bg-[#dbf0ef] p-4">
                  <Text className="text-center text-base font-bold text-[#004959]">
                    {createdDoctor.name}
                  </Text>
                  <Text className="text-center text-sm font-semibold text-[#0e706f]">
                    CRM {createdDoctor.crm}
                  </Text>
                  {createdDoctor.specialties.length > 0 ? (
                    <Text className="mt-1 text-center text-xs font-medium text-[#004959]">
                      Especialidades: {createdDoctor.specialties.join(", ")}
                    </Text>
                  ) : null}
                </View>

                <View className="w-full rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
                  <Text className="text-center text-sm font-semibold text-[#004959]">
                    O acesso já está ativo com o CPF e a senha inicial informada.
                  </Text>
                </View>
              </View>

              <Button
                label="Cadastrar outro médico"
                onPress={handleRegisterAnother}
              />
              <Button
                label="Voltar ao início"
                variant="outline"
                onPress={() => navigation.navigate("AdminHome")}
              />
            </View>
          ) : (
            <View className="gap-5">
              <View
                style={styles.cardShadow}
                className="gap-4 rounded-2xl border border-[#e6ecee] bg-white p-5"
              >
                <Text className="text-lg font-bold text-[#004959]">
                  Dados do profissional
                </Text>

                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nome completo"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      placeholder="Digite o nome do médico"
                      editable={!isSubmitting}
                      error={errors.name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="E-mail"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Digite o e-mail"
                      editable={!isSubmitting}
                      error={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="cpf"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="CPF"
                      value={value}
                      onChangeText={(text) => onChange(maskCpf(text))}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      maxLength={14}
                      placeholder="Digite o CPF"
                      editable={!isSubmitting}
                      error={errors.cpf?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Telefone"
                      value={value}
                      onChangeText={(text) => onChange(maskPhone(text))}
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                      maxLength={15}
                      placeholder="(DDD) 99999-9999"
                      editable={!isSubmitting}
                      error={errors.phone?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="crm"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="CRM (número/UF)"
                      value={value}
                      onChangeText={(text) => onChange(maskCrm(text))}
                      onBlur={onBlur}
                      autoCapitalize="characters"
                      maxLength={10}
                      placeholder="12345/PE"
                      editable={!isSubmitting}
                      error={errors.crm?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Senha inicial"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      autoCapitalize="none"
                      placeholder="Mínimo de 8 caracteres"
                      hint="Repasse esta senha ao médico para o primeiro acesso."
                      editable={!isSubmitting}
                      error={errors.password?.message}
                    />
                  )}
                />
              </View>

              <View
                style={styles.cardShadow}
                className="gap-3 rounded-2xl border border-[#e6ecee] bg-white p-5"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-lg font-bold text-[#004959]">
                    Especialidades médicas
                  </Text>
                  <Pressable
                    onPress={() => setModalOpen(true)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar nova especialidade"
                    className="min-h-[48px] items-center justify-center rounded-xl border border-[#0e706f] bg-white px-4 active:opacity-80"
                  >
                    <Text className="text-sm font-bold text-[#0e706f]">
                      + Nova
                    </Text>
                  </Pressable>
                </View>

                <Controller
                  control={control}
                  name="specialtyIds"
                  render={({ field: { value, onChange } }) => {
                    const selectedItems = specialties.filter((s) =>
                      value.includes(s.id)
                    );
                    const summaryText =
                      specStatus === "loading" && specialties.length === 0
                        ? "Carregando especialidades..."
                        : selectedItems.length > 0
                          ? selectedItems.map((s) => s.name).join(", ")
                          : "Selecione uma ou mais especialidades";

                    const { haloStyle, boxStyle } = getFieldFrameStyles({
                      active: dropdownOpen,
                      error: Boolean(errors.specialtyIds?.message),
                    });

                    return (
                      <View className="gap-3">
                        <View style={haloStyle}>
                          <Pressable
                            onPress={() => setDropdownOpen(true)}
                            disabled={isSubmitting}
                            accessibilityRole="button"
                            accessibilityLabel={
                              selectedItems.length > 0
                                ? `Especialidades selecionadas: ${summaryText}. Toque para alterar`
                                : "Selecionar especialidades médicas"
                            }
                            accessibilityState={{
                              expanded: dropdownOpen,
                              disabled: isSubmitting,
                            }}
                            style={boxStyle}
                            className={`min-h-[64px] flex-row items-center justify-between gap-3 px-4 py-2.5 active:opacity-85 ${
                              isSubmitting ? "opacity-60" : ""
                            }`}
                          >
                            <View className="min-w-0 flex-1">
                              <Text className="text-xs font-medium text-[#6b7280]">
                                Especialidades
                              </Text>
                              <Text
                                numberOfLines={1}
                                className={`mt-0.5 text-base font-bold ${
                                  selectedItems.length > 0
                                    ? "text-[#004959]"
                                    : "text-[#6b7280]"
                                }`}
                              >
                                {summaryText}
                              </Text>
                            </View>

                            <ChevronDownIcon color="#0e706f" />
                          </Pressable>
                        </View>

                        {selectedItems.length > 0 ? (
                          <View className="flex-row flex-wrap gap-2">
                            {selectedItems.map((item) => (
                              <View
                                key={item.id}
                                className="rounded-full bg-[#dbf0ef] px-3 py-1.5"
                              >
                                <Text className="text-xs font-bold text-[#004959]">
                                  {item.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        <Modal
                          open={dropdownOpen}
                          onClose={() => setDropdownOpen(false)}
                          title="Escolha as especialidades"
                          closeLabel="Fechar lista de especialidades"
                        >
                          <ScrollView
                            className="max-h-[420px]"
                            showsVerticalScrollIndicator={false}
                            contentContainerClassName="gap-2.5 pb-2"
                          >
                            {specStatus === "loading" ? (
                              <View className="min-h-[120px] items-center justify-center gap-3 rounded-2xl border border-[#e6ecee] bg-[#f6f8f9] p-6">
                                <ActivityIndicator
                                  size="small"
                                  color="#0e706f"
                                />
                                <Text className="text-sm text-[#6b7280]">
                                  Carregando especialidades...
                                </Text>
                              </View>
                            ) : null}

                            {specStatus === "error" ? (
                              <View className="gap-3 rounded-2xl border border-[#e6ecee] bg-[#f6f8f9] p-4">
                                <Text className="text-sm font-medium text-[#004959]">
                                  Não foi possível carregar as especialidades.
                                </Text>
                                <Button
                                  label="Tentar novamente"
                                  variant="outline"
                                  onPress={() => setReloadKey((k) => k + 1)}
                                />
                              </View>
                            ) : null}

                            {specStatus === "ready" &&
                            specialties.length === 0 ? (
                              <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
                                <Text className="text-sm font-semibold text-[#004959]">
                                  Nenhuma especialidade cadastrada ainda. Crie
                                  uma nova especialidade abaixo.
                                </Text>
                              </View>
                            ) : null}

                            {specStatus === "ready" && specialties.length > 0
                              ? specialties.map((specialty) => {
                                  const isSelected = value.includes(
                                    specialty.id
                                  );
                                  return (
                                    <Pressable
                                      key={specialty.id}
                                      disabled={isSubmitting}
                                      onPress={() => {
                                        const next = isSelected
                                          ? value.filter(
                                              (id) => id !== specialty.id
                                            )
                                          : [...value, specialty.id];
                                        onChange(next);
                                      }}
                                      accessibilityRole="button"
                                      accessibilityLabel={
                                        specialty.description
                                          ? `${specialty.name}. ${specialty.description}`
                                          : specialty.name
                                      }
                                      accessibilityState={{
                                        selected: isSelected,
                                      }}
                                      className={`min-h-[56px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${
                                        isSelected
                                          ? "border-[#0e706f] bg-[#dbf0ef]/60"
                                          : "border-[#e6ecee] bg-white"
                                      }`}
                                    >
                                      <Image
                                        source={getSpecialtyImage(
                                          specialty.name
                                        )}
                                        resizeMode="contain"
                                        className="h-10 w-10 shrink-0"
                                      />

                                      <View className="min-w-0 flex-1">
                                        <Text className="text-base font-bold text-[#004959]">
                                          {specialty.name}
                                        </Text>
                                        {specialty.description ? (
                                          <Text className="mt-0.5 text-xs text-[#6b7280]">
                                            {specialty.description}
                                          </Text>
                                        ) : null}
                                      </View>

                                      {isSelected ? <CheckIcon /> : null}
                                    </Pressable>
                                  );
                                })
                              : null}
                          </ScrollView>

                          <View className="gap-2.5 pt-3">
                            <Button
                              label="Confirmar seleção"
                              onPress={() => setDropdownOpen(false)}
                            />
                            <Button
                              label="+ Nova especialidade"
                              variant="outline"
                              onPress={() => {
                                setDropdownOpen(false);
                                setModalOpen(true);
                              }}
                            />
                          </View>
                        </Modal>
                      </View>
                    );
                  }}
                />

                {errors.specialtyIds?.message ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-xs font-medium text-danger"
                  >
                    {errors.specialtyIds.message}
                  </Text>
                ) : null}
              </View>

              {errors.root?.message ? (
                <View className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
                  <Text
                    accessibilityRole="alert"
                    className="text-center text-sm font-medium text-danger"
                  >
                    {errors.root.message}
                  </Text>
                </View>
              ) : null}

              <Button
                label={isSubmitting ? "Cadastrando..." : "Cadastrar médico"}
                loading={isSubmitting}
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <NewSpecialtyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleSpecialtyCreated}
      />
    </View>
  );
}

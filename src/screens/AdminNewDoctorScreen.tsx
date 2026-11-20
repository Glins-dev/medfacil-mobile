import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";

import { Button, Input } from "@/components";
import { NewSpecialtyModal } from "@/components/modals/NewSpecialtyModal";
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

type Props = BottomTabScreenProps<AdminTabParamList, "AdminDoctors">;
type SpecLoadStatus = "loading" | "ready" | "error";

const bySpecialtyName = (a: AdminSpecialty, b: AdminSpecialty) =>
  a.name.localeCompare(b.name, "pt-BR");

function SuccessCheckIcon() {
  return (
    <Svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.4}
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
  const [createdDoctor, setCreatedDoctor] = useState<CreatedDoctor | null>(
    null
  );

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
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-brand-cream"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow gap-5 px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => navigation.navigate("AdminHome")}
              accessibilityRole="button"
              accessibilityLabel="Voltar para o início"
              className="min-h-[48px] justify-center rounded-lg px-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-brand underline">
                Voltar ao início
              </Text>
            </Pressable>

            <Text className="text-lg font-bold tracking-tight text-brand-dark">
              Med<Text className="font-semibold italic text-brand">fácil</Text>
            </Text>
          </View>

          {createdDoctor ? (
            <View className="gap-5 pt-4">
              <View className="items-center gap-3 rounded-3xl border border-line bg-white p-6">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                  <SuccessCheckIcon />
                </View>
                <Text
                  accessibilityRole="header"
                  className="text-center text-2xl font-bold text-brand-dark"
                >
                  Médico cadastrado
                </Text>
                <Text className="text-center text-sm text-muted">
                  {createdDoctor.name} (CRM {createdDoctor.crm}) já pode acessar
                  o sistema com o CPF e a senha inicial informada.
                </Text>
                {createdDoctor.specialties.length > 0 ? (
                  <Text className="text-center text-xs font-semibold text-brand">
                    Especialidades: {createdDoctor.specialties.join(", ")}
                  </Text>
                ) : null}
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
            <>
              <View>
                <Text
                  accessibilityRole="header"
                  className="text-3xl font-bold text-ink"
                >
                  Cadastrar médico
                </Text>
                <Text className="mt-1 text-base text-muted">
                  Crie o acesso profissional e vincule as especialidades.
                </Text>
              </View>

              <View className="gap-4">
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

                <View className="gap-2 pt-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-sm font-semibold text-ink">
                      Especialidades
                    </Text>
                    <Pressable
                      onPress={() => setModalOpen(true)}
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="Nova especialidade"
                      className="min-h-[48px] justify-center px-2 active:opacity-70"
                    >
                      <Text className="text-sm font-bold text-brand underline">
                        + Nova especialidade
                      </Text>
                    </Pressable>
                  </View>

                  {specStatus === "loading" ? (
                    <View className="min-h-[72px] items-center justify-center gap-2 rounded-2xl border border-line bg-white p-4">
                      <ActivityIndicator size="small" color="#0e706f" />
                      <Text className="text-xs text-muted">
                        Carregando especialidades...
                      </Text>
                    </View>
                  ) : null}

                  {specStatus === "error" ? (
                    <View className="gap-3 rounded-2xl border border-line bg-white p-4">
                      <Text className="text-sm text-ink">
                        Não foi possível carregar as especialidades.
                      </Text>
                      <Button
                        label="Tentar novamente"
                        variant="outline"
                        onPress={() => setReloadKey((k) => k + 1)}
                      />
                    </View>
                  ) : null}

                  {specStatus === "ready" && specialties.length === 0 ? (
                    <View className="rounded-2xl border border-line bg-white p-4">
                      <Text className="text-sm text-muted">
                        Nenhuma especialidade cadastrada ainda. Crie a primeira
                        em "+ Nova especialidade".
                      </Text>
                    </View>
                  ) : null}

                  {specStatus === "ready" && specialties.length > 0 ? (
                    <Controller
                      control={control}
                      name="specialtyIds"
                      render={({ field: { value, onChange } }) => (
                        <View className="flex-row flex-wrap gap-2">
                          {specialties.map((specialty) => {
                            const selected = value.includes(specialty.id);
                            return (
                              <Pressable
                                key={specialty.id}
                                disabled={isSubmitting}
                                onPress={() => {
                                  const next = selected
                                    ? value.filter((id) => id !== specialty.id)
                                    : [...value, specialty.id];
                                  onChange(next);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={specialty.name}
                                accessibilityState={{ selected }}
                                className={`min-h-[48px] items-center justify-center rounded-full border-2 px-4 active:opacity-85 ${
                                  selected
                                    ? "border-brand bg-brand"
                                    : "border-line bg-white"
                                }`}
                              >
                                <Text
                                  className={`text-sm font-semibold ${
                                    selected ? "text-white" : "text-ink"
                                  }`}
                                >
                                  {specialty.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    />
                  ) : null}

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
                  <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
                    <Text
                      accessibilityRole="alert"
                      className="text-center text-sm font-medium text-danger"
                    >
                      {errors.root.message}
                    </Text>
                  </View>
                ) : null}

                <View className="pt-2">
                  <Button
                    label={
                      isSubmitting ? "Cadastrando..." : "Cadastrar médico"
                    }
                    loading={isSubmitting}
                    onPress={() => {
                      void handleSubmit(onSubmit)();
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <NewSpecialtyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleSpecialtyCreated}
      />
    </SafeAreaView>
  );
}

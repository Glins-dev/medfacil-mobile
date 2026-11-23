import {
  type ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";

import {
  AppScreenHeader,
  Button,
  FLOATING_TAB_BAR_SCROLL_OFFSET,
  getFieldFrameStyles,
  Input,
  Modal,
} from "@/components";
import { BuildingHospitalIcon } from "@/navigation/icons";
import type { AdminTabParamList } from "@/navigation/types";
import {
  createHospitalSchema,
  type CreateHospitalFormData,
} from "@/schemas/admin.schema";
import { adminService, type AdminSpecialty } from "@/services/admin.service";
import { useAdminStore } from "@/stores/admin.store";
import { filterCompatibleDoctorsForHospital } from "@/utils/adminRules";
import { resolveHospitalSpecialties } from "@/utils/specialties";

type Props = BottomTabScreenProps<AdminTabParamList, "AdminHospitals">;
type LoadStatus = "loading" | "ready" | "error";

const byName = (a: AdminSpecialty, b: AdminSpecialty) =>
  a.name.localeCompare(b.name, "pt-BR");

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#eef2f4",
    borderRadius: 24,
    backgroundColor: "#ffffff",
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

function CheckIcon({ color = "#ffffff", size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

// Tela administrativa para cadastrar hospitais e vincular medicos compativeis por especialidade.
export function AdminHospitalsScreen({ navigation }: Props) {
  const doctors = useAdminStore((s) => s.doctors);
  const hospitals = useAdminStore((s) => s.hospitals);
  const storedSpecialties = useAdminStore((s) => s.specialties);

  const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
  const [specStatus, setSpecStatus] = useState<LoadStatus>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    null
  );
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cardTopOffsetRef = useRef(0);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setSpecStatus("loading");
    }
    try {
      const items = await adminService.listSpecialties();
      const sorted = [...items].sort(byName);
      setSpecialties(sorted);
      setSpecStatus("ready");
      await adminService.listDoctors(sorted);
    } catch {
      setSpecStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData(specialties.length > 0);
    }, [loadData, specialties.length])
  );

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hospitals.length === 0) {
      setSelectedHospitalId(null);
      return;
    }
    if (
      !selectedHospitalId ||
      !hospitals.some((item) => item.id === selectedHospitalId)
    ) {
      setSelectedHospitalId(hospitals[0].id);
    }
  }, [hospitals, selectedHospitalId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const scrollToField = useCallback((fieldKey: string) => {
    const fieldY = fieldOffsetsRef.current[fieldKey];
    if (fieldY === undefined) return;
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      const targetY = Math.max(0, cardTopOffsetRef.current + fieldY - 100);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 120);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHospitalFormData>({
    resolver: zodResolver(createHospitalSchema),
    defaultValues: {
      name: "",
      address: "",
      specialtyIds: [],
    },
  });

  const onCreateHospital = async (data: CreateHospitalFormData) => {
    setActionError("");
    try {
      const created = await adminService.createHospital({
        name: data.name.trim(),
        address: data.address.trim(),
        specialtyIds: data.specialtyIds,
      });
      setSelectedHospitalId(created.id);
      reset({ name: "", address: "", specialtyIds: [] });
      setNotice(`Hospital "${created.name}" cadastrado com sucesso.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o hospital."
      );
    }
  };

  const selectedHospital =
    hospitals.find((item) => item.id === selectedHospitalId) ?? null;

  const compatibility = useMemo(() => {
    if (!selectedHospital) {
      return { compatible: [], linked: [], availableToLink: [] };
    }
    return filterCompatibleDoctorsForHospital(doctors, selectedHospital);
  }, [doctors, selectedHospital]);

  const combinedSpecialties = useMemo(() => {
    const doctorPairs = doctors.flatMap((doc) =>
      doc.specialtyIds.map((id, idx) => ({
        id,
        name: doc.specialtyNames[idx] ?? "",
        description: null,
      }))
    );
    return [...storedSpecialties, ...specialties, ...doctorPairs];
  }, [doctors, specialties, storedSpecialties]);

  const handleLinkDoctor = async (doctorId: string, doctorName: string) => {
    if (!selectedHospital) return;
    setActionError("");
    try {
      await adminService.linkDoctorToHospital(selectedHospital.id, doctorId);
      setNotice(`${doctorName} vinculado ao ${selectedHospital.name}.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível vincular o médico."
      );
    }
  };

  const handleUnlinkDoctor = async (
    hospitalId: string,
    hospitalName: string,
    doctorId: string,
    doctorName: string
  ) => {
    setActionError("");
    try {
      await adminService.unlinkDoctorFromHospital(hospitalId, doctorId);
      setNotice(`${doctorName} desvinculado de ${hospitalName}.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível desvincular o médico."
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const { haloStyle: hospitalHaloStyle, boxStyle: hospitalBoxStyle } =
    getFieldFrameStyles({ active: hospitalModalOpen });

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Hospitais"
        subtitle="Cadastre unidades e vincule médicos compatíveis."
        onBackPress={() => navigation.navigate("AdminHome")}
        backAccessibilityLabel="Voltar para o início"
        icon={<BuildingHospitalIcon color="#0e706f" size={28} />}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-6"
          contentContainerStyle={{
            paddingBottom:
              scrollBottomPadding +
              (keyboardHeight > 0 ? keyboardHeight + 32 : 0),
          }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
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

          {actionError ? (
            <View
              accessibilityRole="alert"
              className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3"
            >
              <Text className="text-sm font-medium text-danger">
                {actionError}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.card}
            onLayout={(event) => {
              cardTopOffsetRef.current = event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <Text className="text-lg font-bold text-[#004959]">
              Adicionar novo hospital
            </Text>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.name = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nome do hospital"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("name")}
                    onBlur={onBlur}
                    placeholder="Ex.: Hospital Santa Clara"
                    editable={!isSubmitting}
                    error={errors.name?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.address = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Endereço"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => scrollToField("address")}
                    onBlur={onBlur}
                    placeholder="Ex.: Av. Agamenon Magalhães, 1200"
                    editable={!isSubmitting}
                    error={errors.address?.message}
                  />
                )}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#004959]">
                Especialidades presentes
              </Text>

              {specStatus === "loading" ? (
                <View className="min-h-[80px] items-center justify-center gap-2 rounded-2xl border border-[#eef2f4] bg-[#f9fcfc] p-4">
                  <ActivityIndicator size="small" color="#0e706f" />
                  <Text className="text-xs text-[#6b7280]">
                    Carregando especialidades...
                  </Text>
                </View>
              ) : null}

              {specStatus === "error" ? (
                <View className="gap-3 rounded-2xl border border-[#eef2f4] bg-[#f9fcfc] p-4">
                  <Text className="text-sm text-[#004959]">
                    Não foi possível carregar as especialidades.
                  </Text>
                  <Button
                    label="Tentar novamente"
                    variant="outline"
                    onPress={() => {
                      void loadData();
                    }}
                  />
                </View>
              ) : null}

              {specStatus === "ready" && specialties.length === 0 ? (
                <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
                  <Text className="text-sm font-semibold text-[#004959]">
                    Cadastre ao menos uma especialidade no painel inicial antes
                    de criar hospitais.
                  </Text>
                </View>
              ) : null}

              {specStatus === "ready" && specialties.length > 0 ? (
                <Controller
                  control={control}
                  name="specialtyIds"
                  render={({ field: { value, onChange } }) => (
                    <View className="gap-2">
                      {specialties.map((specialty) => {
                        const checked = value.includes(specialty.id);
                        return (
                          <Pressable
                            key={specialty.id}
                            disabled={isSubmitting}
                            onPress={() => {
                              const next = checked
                                ? value.filter((id) => id !== specialty.id)
                                : [...value, specialty.id];
                              onChange(next);
                            }}
                            accessibilityRole="checkbox"
                            accessibilityLabel={specialty.name}
                            accessibilityState={{ checked, disabled: isSubmitting }}
                            className={`min-h-[48px] flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-85 ${
                              checked
                                ? "border-[#0e706f] bg-[#dff4f2]"
                                : "border-[#e6ecee] bg-[#f6f8f9]"
                            }`}
                          >
                            <View
                              className={`h-5 w-5 items-center justify-center rounded-md border ${
                                checked
                                  ? "border-[#0e706f] bg-[#0e706f]"
                                  : "border-[#9ca3af] bg-white"
                              }`}
                            >
                              {checked ? (
                                <CheckIcon color="#ffffff" size={13} />
                              ) : null}
                            </View>

                            <View className="min-w-0 flex-1">
                              <Text
                                className={`text-sm ${
                                  checked
                                    ? "font-bold text-[#004959]"
                                    : "font-medium text-[#4b5563]"
                                }`}
                              >
                                {specialty.name}
                              </Text>
                            </View>
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

            <Button
              label={isSubmitting ? "Cadastrando..." : "Cadastrar hospital"}
              loading={isSubmitting}
              onPress={() => {
                void handleSubmit(onCreateHospital)();
              }}
            />
          </View>

          <View style={styles.card} className="gap-4 p-5">
            <Text className="text-lg font-bold text-[#004959]">
              Vincular médicos a hospitais
            </Text>

            {hospitals.length === 0 ? (
              <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
                <Text className="text-sm font-semibold text-[#004959]">
                  Cadastre um hospital acima para selecionar e vincular médicos
                  compatíveis.
                </Text>
              </View>
            ) : (
              <>
                <View style={hospitalHaloStyle}>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setHospitalModalOpen(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedHospital
                        ? `Hospital selecionado: ${selectedHospital.name}. Toque para trocar`
                        : "Selecionar hospital"
                    }
                    accessibilityState={{ expanded: hospitalModalOpen }}
                    style={hospitalBoxStyle}
                    className="min-h-[60px] flex-row items-center justify-between gap-3 px-4 py-2.5 active:opacity-85"
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-medium text-[#6b7280]">
                        Hospital selecionado
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-base font-bold text-[#004959]"
                      >
                        {selectedHospital?.name ?? "Selecione um hospital"}
                      </Text>
                    </View>
                    <ChevronDownIcon color="#0e706f" />
                  </Pressable>
                </View>

                {selectedHospital ? (
                  <View className="gap-4">
                    <View className="gap-1.5">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                        Especialidades do hospital
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {resolveHospitalSpecialties(
                          selectedHospital.specialtyIds,
                          combinedSpecialties,
                          selectedHospital.specialtyNamesById
                        ).map((spec) => (
                          <View
                            key={`${selectedHospital.id}-${spec.id}-${spec.name}`}
                            className="rounded-full bg-[#dbf0ef] px-2.5 py-1"
                          >
                            <Text className="text-xs font-bold text-[#004959]">
                              {spec.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {compatibility.compatible.length === 0 ? (
                      <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
                        <Text className="text-sm font-bold text-[#004959]">
                          Nenhum médico compatível disponível
                        </Text>
                        <Text className="mt-1 text-xs text-[#004959]">
                          Não há médicos cadastrados com especialidade presente
                          neste hospital.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {compatibility.linked.length > 0 ? (
                          <View className="gap-2">
                            <Text className="text-sm font-bold text-[#004959]">
                              Médicos vinculados ({compatibility.linked.length})
                            </Text>
                            {compatibility.linked.map((doc) => (
                              <View
                                key={doc.id}
                                className="flex-row items-center justify-between gap-3 rounded-2xl border border-[#0e706f]/30 bg-[#dff4f2]/70 p-3.5"
                              >
                                <View className="min-w-0 flex-1">
                                  <Text
                                    numberOfLines={1}
                                    className="text-sm font-bold text-[#004959]"
                                  >
                                    {doc.name}
                                  </Text>
                                  <Text className="text-xs text-[#0e706f]">
                                    CRM {doc.crm}
                                    {doc.specialtyNames.length > 0
                                      ? ` · ${doc.specialtyNames.join(", ")}`
                                      : ""}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => {
                                    void handleUnlinkDoctor(
                                      selectedHospital.id,
                                      selectedHospital.name,
                                      doc.id,
                                      doc.name
                                    );
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Desvincular médico ${doc.name} do hospital ${selectedHospital.name}`}
                                  className="min-h-[48px] items-center justify-center rounded-xl border border-danger bg-white px-3.5 active:opacity-80"
                                >
                                  <Text className="text-xs font-bold text-danger">
                                    Desvincular
                                  </Text>
                                </Pressable>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        <View className="gap-2">
                          <Text className="text-sm font-bold text-[#004959]">
                            Disponíveis com especialidade compatível (
                            {compatibility.availableToLink.length})
                          </Text>

                          {compatibility.availableToLink.length === 0 ? (
                            <View className="rounded-2xl border border-[#eef2f4] bg-[#f9fcfc] p-3.5">
                              <Text className="text-xs text-[#6b7280]">
                                Todos os médicos compatíveis já estão vinculados
                                a este hospital.
                              </Text>
                            </View>
                          ) : (
                            compatibility.availableToLink.map((doc) => (
                              <View
                                key={doc.id}
                                className="flex-row items-center justify-between gap-3 rounded-2xl border border-[#e6ecee] bg-[#f9fcfc] p-3.5"
                              >
                                <View className="min-w-0 flex-1">
                                  <Text
                                    numberOfLines={1}
                                    className="text-sm font-bold text-[#004959]"
                                  >
                                    {doc.name}
                                  </Text>
                                  <Text className="text-xs text-[#6b7280]">
                                    CRM {doc.crm}
                                    {doc.specialtyNames.length > 0
                                      ? ` · ${doc.specialtyNames.join(", ")}`
                                      : ""}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => {
                                    void handleLinkDoctor(doc.id, doc.name);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Vincular médico ${doc.name} ao hospital ${selectedHospital.name}`}
                                  className="min-h-[48px] items-center justify-center rounded-xl bg-[#0e706f] px-4 active:opacity-85"
                                >
                                  <Text className="text-xs font-bold text-white">
                                    Vincular
                                  </Text>
                                </Pressable>
                              </View>
                            ))
                          )}
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-xl font-bold text-[#004959]">
              Hospitais cadastrados ({hospitals.length})
            </Text>

            {hospitals.length === 0 ? (
              <View style={styles.card} className="p-4">
                <Text className="text-sm text-[#6b7280]">
                  Nenhum hospital cadastrado até o momento.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {hospitals.map((hospital) => {
                  const linkedDocs = doctors.filter((doc) =>
                    hospital.doctorIds.includes(doc.id)
                  );
                  return (
                    <View
                      key={hospital.id}
                      style={styles.card}
                      className="gap-2.5 p-4"
                    >
                      <Text className="text-base font-bold text-[#004959]">
                        {hospital.name}
                      </Text>
                      <Text className="text-sm text-[#6b7280]">
                        {hospital.address}
                      </Text>

                      <View className="flex-row flex-wrap gap-1.5">
                        {resolveHospitalSpecialties(
                          hospital.specialtyIds,
                          combinedSpecialties,
                          hospital.specialtyNamesById
                        ).map((spec) => (
                          <View
                            key={`${hospital.id}-${spec.id}-${spec.name}`}
                            className="rounded-full bg-[#dbf0ef] px-2.5 py-1"
                          >
                            <Text className="text-xs font-bold text-[#004959]">
                              {spec.name}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text className="text-xs text-[#6b7280]">
                        {linkedDocs.length > 0
                          ? `Médicos vinculados: ${linkedDocs.map((d) => d.name).join(", ")}`
                          : "Nenhum médico vinculado"}
                      </Text>

                      <Button
                        label="Selecionar para gerenciar vínculos"
                        variant="outline"
                        onPress={() => setSelectedHospitalId(hospital.id)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        open={hospitalModalOpen}
        onClose={() => setHospitalModalOpen(false)}
        title="Escolha o hospital"
        closeLabel="Fechar lista de hospitais"
      >
        <ScrollView
          className="max-h-[380px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2.5 pb-2"
        >
          {hospitals.map((hospital) => {
            const selected = hospital.id === selectedHospital?.id;
            return (
              <Pressable
                key={hospital.id}
                onPress={() => {
                  setSelectedHospitalId(hospital.id);
                  setHospitalModalOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={hospital.name}
                accessibilityState={{ selected }}
                className={`min-h-[56px] flex-row items-center justify-between gap-3 rounded-2xl border px-4 py-3 active:opacity-85 ${
                  selected
                    ? "border-[#0e706f] bg-[#dff4f2]"
                    : "border-[#eef2f4] bg-[#f9fcfc]"
                }`}
              >
                <View className="min-w-0 flex-1">
                  <Text
                    className={`text-base font-bold ${
                      selected ? "text-[#0e706f]" : "text-[#004959]"
                    }`}
                  >
                    {hospital.name}
                  </Text>
                  <Text className="text-xs text-[#6b7280]">
                    {hospital.address}
                  </Text>
                </View>
                {selected ? <CheckIcon color="#0e706f" size={18} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </View>
  );
}

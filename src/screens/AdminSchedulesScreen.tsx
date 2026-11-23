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
import { CalendarIcon } from "@/navigation/icons";
import type { AdminTabParamList } from "@/navigation/types";
import {
  createScheduleSlotSchema,
  type CreateScheduleSlotFormData,
} from "@/schemas/admin.schema";
import { adminService } from "@/services/admin.service";
import { useAdminStore } from "@/stores/admin.store";
import type { ScheduleSlot } from "@/types/admin";
import { brDateToIsoKey } from "@/utils/adminRules";
import {
  describeDate,
  getPeriod,
  getUpcomingDates,
} from "@/utils/date";
import { maskDate, maskTime } from "@/utils/masks";

type Props = BottomTabScreenProps<AdminTabParamList, "AdminSchedules">;

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

function isoKeyToBrDate(isoKey: string): string {
  const [yyyy, mm, dd] = isoKey.split("-");
  if (!yyyy || !mm || !dd) return "";
  return `${dd}/${mm}/${yyyy}`;
}

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

// Tela administrativa para adicionar e remover horarios disponiveis dos medicos.
export function AdminSchedulesScreen({ navigation }: Props) {
  const doctors = useAdminStore((s) => s.doctors);
  const hospitals = useAdminStore((s) => s.hospitals);
  const scheduleSlots = useAdminStore((s) => s.scheduleSlots);

  const [refreshing, setRefreshing] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<ScheduleSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState(false);
  const [notice, setNotice] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cardTopOffsetRef = useRef(0);
  const fieldOffsetsRef = useRef<Record<string, number>>({});
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upcomingKeys = useMemo(() => getUpcomingDates(2), []);
  const todayBr = useMemo(
    () => (upcomingKeys[0] ? isoKeyToBrDate(upcomingKeys[0]) : ""),
    [upcomingKeys]
  );
  const tomorrowBr = useMemo(
    () => (upcomingKeys[1] ? isoKeyToBrDate(upcomingKeys[1]) : ""),
    [upcomingKeys]
  );

  useEffect(() => {
    void adminService.listDoctors();
  }, []);

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
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateScheduleSlotFormData>({
    resolver: zodResolver(createScheduleSlotSchema),
    defaultValues: {
      doctorId: "",
      hospitalId: "",
      date: todayBr,
      time: "",
    },
  });

  const watchedDoctorId = watch("doctorId");
  const selectedDoctor =
    doctors.find((item) => item.id === watchedDoctorId) ?? null;

  const doctorLinkedHospitals = useMemo(() => {
    if (!selectedDoctor) return [];
    return hospitals.filter((hosp) => hosp.doctorIds.includes(selectedDoctor.id));
  }, [hospitals, selectedDoctor]);

  const onSubmit = async (data: CreateScheduleSlotFormData) => {
    clearErrors("root");
    const isoDate = brDateToIsoKey(data.date);
    if (!isoDate) {
      setError("date", { message: "Data inválida." });
      return;
    }

    try {
      const created = await adminService.createScheduleSlot({
        doctorId: data.doctorId,
        hospitalId: data.hospitalId || null,
        date: isoDate,
        time: data.time.trim(),
      });
      setValue("time", "");
      const docName = selectedDoctor?.name ?? "médico";
      setNotice(
        `Horário ${created.time} em ${isoKeyToBrDate(created.date)} adicionado para ${docName}.`
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o horário.";
      if (msg.includes("já possui")) {
        setError("time", { message: msg });
      } else {
        setError("root", { message: msg });
      }
    }
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete || deletingSlot) return;
    setDeletingSlot(true);
    try {
      const target = slotToDelete;
      await adminService.deleteScheduleSlot(target.id);
      setSlotToDelete(null);
      setNotice(
        `Horário ${target.time} em ${isoKeyToBrDate(target.date)} excluído.`
      );
    } finally {
      setDeletingSlot(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await adminService.listDoctors();
    } finally {
      setRefreshing(false);
    }
  };

  const doctorMap = useMemo(() => {
    const map = new Map(doctors.map((d) => [d.id, d]));
    return map;
  }, [doctors]);

  const hospitalMap = useMemo(() => {
    const map = new Map(hospitals.map((h) => [h.id, h]));
    return map;
  }, [hospitals]);

  const { haloStyle: docHaloStyle, boxStyle: docBoxStyle } =
    getFieldFrameStyles({
      active: doctorModalOpen,
      error: Boolean(errors.doctorId?.message),
    });

  const { haloStyle: hospHaloStyle, boxStyle: hospBoxStyle } =
    getFieldFrameStyles({
      active: hospitalModalOpen,
    });

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Horários"
        subtitle="Adicione ou remova horários disponíveis."
        onBackPress={() => navigation.navigate("AdminHome")}
        backAccessibilityLabel="Voltar para o início"
        icon={<CalendarIcon color="#0e706f" size={28} />}
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

          <View
            style={styles.card}
            onLayout={(event) => {
              cardTopOffsetRef.current = event.nativeEvent.layout.y;
            }}
            className="gap-4 p-5"
          >
            <Text className="text-lg font-bold text-[#004959]">
              Adicionar novo horário
            </Text>

            {doctors.length === 0 ? (
              <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
                <Text className="text-sm font-semibold text-[#004959]">
                  Nenhum médico cadastrado disponível. Cadastre um médico para
                  gerenciar horários.
                </Text>
              </View>
            ) : null}

            <View className="gap-1.5">
              <Text className="text-sm font-semibold text-[#004959]">
                Médico
              </Text>

              <Controller
                control={control}
                name="doctorId"
                render={({ field: { value, onChange } }) => {
                  const chosen = doctors.find((d) => d.id === value) ?? null;
                  return (
                    <>
                      <View style={docHaloStyle}>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setDoctorModalOpen(true);
                          }}
                          disabled={isSubmitting || doctors.length === 0}
                          accessibilityRole="button"
                          accessibilityLabel={
                            chosen
                              ? `Médico: ${chosen.name}. Toque para alterar`
                              : "Selecionar médico"
                          }
                          accessibilityState={{
                            expanded: doctorModalOpen,
                            disabled: isSubmitting || doctors.length === 0,
                          }}
                          style={docBoxStyle}
                          className={`min-h-[48px] flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-85 ${
                            doctors.length === 0 ? "opacity-60" : ""
                          }`}
                        >
                          <Text
                            numberOfLines={1}
                            className={`flex-1 text-base ${
                              chosen ? "text-ink" : "text-[#6b7280]"
                            }`}
                          >
                            {chosen
                              ? `${chosen.name} (${chosen.crm})`
                              : "Selecione o médico"}
                          </Text>
                          <ChevronDownIcon color="#0e706f" />
                        </Pressable>
                      </View>

                      <Modal
                        open={doctorModalOpen}
                        onClose={() => setDoctorModalOpen(false)}
                        title="Escolha o médico"
                        closeLabel="Fechar lista de médicos"
                      >
                        <ScrollView
                          className="max-h-[380px]"
                          showsVerticalScrollIndicator={false}
                          contentContainerClassName="gap-2.5 pb-2"
                        >
                          {doctors.map((doctor) => {
                            const selected = doctor.id === value;
                            return (
                              <Pressable
                                key={doctor.id}
                                onPress={() => {
                                  onChange(doctor.id);
                                  setValue("hospitalId", "");
                                  setDoctorModalOpen(false);
                                }}
                                accessibilityRole="radio"
                                accessibilityLabel={`${doctor.name}, CRM ${doctor.crm}`}
                                accessibilityState={{
                                  selected,
                                  checked: selected,
                                }}
                                className={`min-h-[56px] flex-row items-center justify-between gap-3 rounded-2xl border px-4 py-3 active:opacity-85 ${
                                  selected
                                    ? "border-[#0e706f] bg-[#dff4f2]"
                                    : "border-[#eef2f4] bg-[#f9fcfc]"
                                }`}
                              >
                                <View className="min-w-0 flex-1">
                                  <Text
                                    className={`text-base font-bold ${
                                      selected
                                        ? "text-[#0e706f]"
                                        : "text-[#004959]"
                                    }`}
                                  >
                                    {doctor.name}
                                  </Text>
                                  <Text className="text-xs text-[#6b7280]">
                                    CRM {doctor.crm}
                                    {doctor.specialtyNames.length > 0
                                      ? ` · ${doctor.specialtyNames.join(", ")}`
                                      : ""}
                                  </Text>
                                </View>
                                {selected ? <CheckIcon /> : null}
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </Modal>
                    </>
                  );
                }}
              />

              {errors.doctorId?.message ? (
                <Text
                  accessibilityRole="alert"
                  className="text-xs font-medium text-danger"
                >
                  {errors.doctorId.message}
                </Text>
              ) : null}
            </View>

            {doctorLinkedHospitals.length > 0 ? (
              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-[#004959]">
                  Hospital vinculado (opcional)
                </Text>

                <Controller
                  control={control}
                  name="hospitalId"
                  render={({ field: { value, onChange } }) => {
                    const chosenHospital =
                      doctorLinkedHospitals.find((h) => h.id === value) ?? null;
                    return (
                      <>
                        <View style={hospHaloStyle}>
                          <Pressable
                            onPress={() => {
                              Keyboard.dismiss();
                              setHospitalModalOpen(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={
                              chosenHospital
                                ? `Hospital: ${chosenHospital.name}`
                                : "Selecionar hospital vinculado"
                            }
                            accessibilityState={{ expanded: hospitalModalOpen }}
                            style={hospBoxStyle}
                            className="min-h-[48px] flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-85"
                          >
                            <Text
                              numberOfLines={1}
                              className={`flex-1 text-base ${
                                chosenHospital ? "text-ink" : "text-[#6b7280]"
                              }`}
                            >
                              {chosenHospital
                                ? chosenHospital.name
                                : "Unidade padrão"}
                            </Text>
                            <ChevronDownIcon color="#0e706f" />
                          </Pressable>
                        </View>

                        <Modal
                          open={hospitalModalOpen}
                          onClose={() => setHospitalModalOpen(false)}
                          title="Hospital do atendimento"
                          closeLabel="Fechar lista de hospitais"
                        >
                          <View className="gap-2.5 pb-2">
                            <Pressable
                              onPress={() => {
                                onChange("");
                                setHospitalModalOpen(false);
                              }}
                              accessibilityRole="radio"
                              accessibilityLabel="Unidade padrão"
                              accessibilityState={{
                                selected: !value,
                                checked: !value,
                              }}
                              className={`min-h-[48px] flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                                !value
                                  ? "border-[#0e706f] bg-[#dff4f2]"
                                  : "border-[#eef2f4] bg-[#f9fcfc]"
                              }`}
                            >
                              <Text className="text-sm font-bold text-[#004959]">
                                Unidade padrão
                              </Text>
                              {!value ? <CheckIcon /> : null}
                            </Pressable>

                            {doctorLinkedHospitals.map((hospital) => {
                              const selected = hospital.id === value;
                              return (
                                <Pressable
                                  key={hospital.id}
                                  onPress={() => {
                                    onChange(hospital.id);
                                    setHospitalModalOpen(false);
                                  }}
                                  accessibilityRole="radio"
                                  accessibilityLabel={hospital.name}
                                  accessibilityState={{
                                    selected,
                                    checked: selected,
                                  }}
                                  className={`min-h-[48px] flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                                    selected
                                      ? "border-[#0e706f] bg-[#dff4f2]"
                                      : "border-[#eef2f4] bg-[#f9fcfc]"
                                  }`}
                                >
                                  <Text className="text-sm font-bold text-[#004959]">
                                    {hospital.name}
                                  </Text>
                                  {selected ? <CheckIcon /> : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        </Modal>
                      </>
                    );
                  }}
                />
              </View>
            ) : null}

            <View className="flex-row gap-2">
              {todayBr ? (
                <Pressable
                  onPress={() => setValue("date", todayBr, { shouldValidate: true })}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar data de hoje (${todayBr})`}
                  className="min-h-[48px] items-center justify-center rounded-full border border-[#0e706f] bg-[#dff4f2] px-4 active:opacity-80"
                >
                  <Text className="text-xs font-bold text-[#004959]">
                    Hoje ({todayBr.slice(0, 5)})
                  </Text>
                </Pressable>
              ) : null}

              {tomorrowBr ? (
                <Pressable
                  onPress={() =>
                    setValue("date", tomorrowBr, { shouldValidate: true })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Usar data de amanhã (${tomorrowBr})`}
                  className="min-h-[48px] items-center justify-center rounded-full border border-[#dce5e7] bg-white px-4 active:opacity-80"
                >
                  <Text className="text-xs font-bold text-[#004959]">
                    Amanhã ({tomorrowBr.slice(0, 5)})
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.date = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Data (DD/MM/AAAA)"
                    value={value}
                    onChangeText={(text) => onChange(maskDate(text))}
                    onFocus={() => scrollToField("date")}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    editable={!isSubmitting}
                    error={errors.date?.message}
                  />
                )}
              />
            </View>

            <View
              onLayout={(event) => {
                fieldOffsetsRef.current.time = event.nativeEvent.layout.y;
              }}
            >
              <Controller
                control={control}
                name="time"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Horário (HH:mm)"
                    value={value}
                    onChangeText={(text) => onChange(maskTime(text))}
                    onFocus={() => scrollToField("time")}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="Ex.: 08:30"
                    hint="Horário oficial da clínica (America/Recife)."
                    editable={!isSubmitting}
                    error={errors.time?.message}
                  />
                )}
              />
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
              label={isSubmitting ? "Salvando..." : "Adicionar horário"}
              loading={isSubmitting}
              disabled={doctors.length === 0}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            />
          </View>

          <View className="gap-3">
            <Text className="text-xl font-bold text-[#004959]">
              Horários cadastrados ({scheduleSlots.length})
            </Text>

            {scheduleSlots.length === 0 ? (
              <View style={styles.card} className="p-4">
                <Text className="text-sm text-[#6b7280]">
                  Nenhum horário adicional cadastrado até o momento.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {scheduleSlots.map((slot) => {
                  const doc = doctorMap.get(slot.doctorId);
                  const hosp = slot.hospitalId
                    ? hospitalMap.get(slot.hospitalId)
                    : null;
                  const dateInfo = describeDate(slot.date);
                  const period = getPeriod(`${slot.date}T${slot.time}:00-03:00`);
                  const doctorName = doc?.name ?? "Médico";

                  return (
                    <View
                      key={slot.id}
                      style={styles.card}
                      className="flex-row items-center justify-between gap-3 p-4"
                    >
                      <View className="h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F7C343]">
                        <Text className="text-base font-bold text-[#004959]">
                          {slot.time}
                        </Text>
                        <Text className="text-[11px] font-bold uppercase text-[#004959]">
                          {period}
                        </Text>
                      </View>

                      <View className="min-w-0 flex-1 gap-0.5">
                        <Text
                          numberOfLines={1}
                          className="text-base font-bold text-[#004959]"
                        >
                          {doctorName}
                        </Text>
                        <Text className="text-xs font-medium text-[#0e706f]">
                          {dateInfo.weekdayLong}, {dateInfo.dayMonth}
                        </Text>
                        {hosp ? (
                          <Text
                            numberOfLines={1}
                            className="text-xs text-[#6b7280]"
                          >
                            {hosp.name}
                          </Text>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={() => setSlotToDelete(slot)}
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir horário de ${doctorName} em ${slot.date} às ${slot.time}`}
                        className="min-h-[48px] items-center justify-center rounded-xl border border-danger bg-white px-3.5 active:opacity-80"
                      >
                        <Text className="text-xs font-bold text-danger">
                          Excluir
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        open={Boolean(slotToDelete)}
        onClose={deletingSlot ? () => {} : () => setSlotToDelete(null)}
        title="Excluir horário"
        closeLabel="Cancelar exclusão de horário"
      >
        {slotToDelete ? (
          <View className="gap-4">
            <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343]/30 p-4">
              <Text className="text-base font-bold text-[#004959]">
                {isoKeyToBrDate(slotToDelete.date)} às {slotToDelete.time}
              </Text>
              <Text className="mt-1 text-sm text-[#004959]">
                Este horário deixará de aparecer disponível para agendamento dos
                pacientes.
              </Text>
            </View>

            <View className="gap-2.5">
              <Button
                label={deletingSlot ? "Excluindo..." : "Confirmar exclusão"}
                variant="danger"
                loading={deletingSlot}
                onPress={() => {
                  void handleConfirmDeleteSlot();
                }}
              />
              <Button
                label="Cancelar"
                variant="outline"
                disabled={deletingSlot}
                onPress={() => setSlotToDelete(null)}
              />
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

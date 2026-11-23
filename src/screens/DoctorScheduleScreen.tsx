import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  Modal,
  SendPrescriptionModal,
} from "@/components";
import { PatientPreChartModal } from "@/components/doctor/PatientPreChartModal";
import { CLINIC_INFO } from "@/constants/clinic";
import { CalendarIcon } from "@/navigation/icons";
import type { DoctorTabParamList } from "@/navigation/types";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/auth.service";
import {
  doctorService,
  type DoctorAppointment,
} from "@/services/doctor.service";
import { useAdminStore } from "@/stores/admin.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  assignOverlapColumns,
  computeTimelineHourRange,
  formatPeriodTitle,
  getCurrentMinutesRecife,
  getMonthCalendarGrid,
  getTodayKeyRecife,
  getWeekDays,
  groupAppointmentsByDate,
  parseDateKey,
  shiftReferenceDate,
  WEEKDAY_INITIALS,
  type CalendarViewMode,
} from "@/utils/calendar";
import {
  describeDayHeading,
  formatLongDate,
  formatTime,
  getPeriod,
} from "@/utils/date";

type Props = BottomTabScreenProps<DoctorTabParamList, "DoctorSchedule">;
type LoadStatus = "loading" | "ready" | "error";

const DAY_HOUR_HEIGHT = 76;
const WEEK_HOUR_HEIGHT = 60;
const DAY_GUTTER_WIDTH = 54;
const WEEK_GUTTER_WIDTH = 48;
const WEEK_DAY_COL_WIDTH = 96;

const VIEW_MODES: Array<{ key: CalendarViewMode; label: string }> = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#004959",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
});

interface EventVisualTheme {
  bg: string;
  accent: string;
  titleText: string;
  subText: string;
  statusLabel: string;
}

function getEventTheme(item: DoctorAppointment): EventVisualTheme {
  if (
    item.status === "CANCELADO" ||
    item.status === "CONCLUIDO" ||
    item.attendanceStatus === "FINALIZADO"
  ) {
    return {
      bg: "#f3f4f6",
      accent: "#9ca3af",
      titleText: "#4b5563",
      subText: "#6b7280",
      statusLabel:
        item.status === "CANCELADO"
          ? "Cancelada"
          : item.status === "CONCLUIDO"
            ? "Concluída"
            : "Finalizada",
    };
  }

  if (item.attendanceStatus === "EM_ESPERA") {
    return {
      bg: "#fef3c7",
      accent: "#F7C343",
      titleText: "#78350f",
      subText: "#92400e",
      statusLabel: "Aguardando atendimento",
    };
  }

  const label =
    item.attendanceStatus === "EM_ATENDIMENTO"
      ? "Em atendimento"
      : item.status === "CONFIRMADO"
        ? "Confirmada"
        : "Agendada";

  return {
    bg: "#dff4f2",
    accent: "#0e706f",
    titleText: "#004959",
    subText: "#0e706f",
    statusLabel: label,
  };
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function ChevronLeftIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#004959"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

function DayTimelineView({
  dateKey,
  todayKey,
  currentMinutes,
  appointments,
  onSelectAppointment,
}: {
  dateKey: string;
  todayKey: string;
  currentMinutes: number;
  appointments: DoctorAppointment[];
  onSelectAppointment: (item: DoctorAppointment) => void;
}) {
  const [canvasWidth, setCanvasWidth] = useState(0);

  const { startHour, endHour, hours } = useMemo(
    () => computeTimelineHourRange(appointments, 7, 20),
    [appointments]
  );

  const positionedEvents = useMemo(
    () => assignOverlapColumns(appointments, 50),
    [appointments]
  );

  const isToday = dateKey === todayKey;
  const totalHeight = hours.length * DAY_HOUR_HEIGHT;
  const minTimelineMinutes = startHour * 60;
  const maxTimelineMinutes = (endHour + 1) * 60;
  const showNowLine =
    isToday &&
    currentMinutes >= minTimelineMinutes &&
    currentMinutes <= maxTimelineMinutes;
  const nowTop =
    ((currentMinutes - minTimelineMinutes) / 60) * DAY_HOUR_HEIGHT;

  return (
    <View className="gap-3">
      {appointments.length === 0 ? (
        <View className="rounded-2xl border border-[#b9e4e1] bg-[#eefaf9] px-4 py-3">
          <Text className="text-sm font-semibold text-[#004959]">
            Nenhum atendimento marcado para este dia.
          </Text>
          <Text className="mt-0.5 text-xs text-[#0e706f]">
            Use as setas acima ou mude para Semana/Mês para consultar outras
            datas.
          </Text>
        </View>
      ) : null}

      <View
        style={styles.cardShadow}
        className="overflow-hidden rounded-3xl border border-[#eef2f4] bg-white p-3"
      >
        <View style={{ height: totalHeight }} className="flex-row">
          <View style={{ width: DAY_GUTTER_WIDTH }}>
            {hours.map((hour) => (
              <View
                key={hour}
                style={{ height: DAY_HOUR_HEIGHT }}
                className="items-end pr-2.5 pt-0.5"
              >
                <Text className="text-[11px] font-semibold text-[#6b7280]">
                  {formatHourLabel(hour)}
                </Text>
              </View>
            ))}
          </View>

          <View
            className="relative flex-1"
            onLayout={(event) => setCanvasWidth(event.nativeEvent.layout.width)}
          >
            {hours.map((hour) => (
              <View
                key={hour}
                style={{ height: DAY_HOUR_HEIGHT }}
                className="border-t border-[#e6ecee]"
              />
            ))}

            {showNowLine ? (
              <View
                pointerEvents="none"
                style={{ top: nowTop }}
                className="absolute left-0 right-0 z-20 flex-row items-center"
              >
                <View className="-ml-1 h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                <View className="h-[2px] flex-1 bg-[#dc2626]" />
              </View>
            ) : null}

            {canvasWidth > 0
              ? positionedEvents.map(
                  ({ item, startMinutes, column, totalColumns }) => {
                    const theme = getEventTheme(item);
                    const top = Math.max(
                      2,
                      ((startMinutes - minTimelineMinutes) / 60) *
                        DAY_HOUR_HEIGHT
                    );
                    const colWidth = canvasWidth / totalColumns;
                    const left = column * colWidth + 2;
                    const width = Math.max(88, colWidth - 4);
                    const timeStr = formatTime(item.dateTime);
                    const specialtyText =
                      item.specialty ?? item.reason ?? "Consulta";
                    const locationText =
                      item.hospitalName ?? CLINIC_INFO.unitLabel;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => onSelectAppointment(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Atendimento às ${timeStr} com ${item.patientName}, ${specialtyText}, ${locationText}`}
                        style={{
                          position: "absolute",
                          top,
                          left,
                          width,
                          minHeight: 62,
                          backgroundColor: theme.bg,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.accent,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                        }}
                        className="justify-center active:opacity-85"
                      >
                        <View className="flex-row items-center justify-between gap-2">
                          <Text
                            numberOfLines={1}
                            style={{ color: theme.subText }}
                            className="text-[11px] font-bold"
                          >
                            {timeStr}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{ color: theme.subText }}
                            className="text-[10px] font-semibold"
                          >
                            {theme.statusLabel}
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={{ color: theme.titleText }}
                          className="text-sm font-bold"
                        >
                          {item.patientName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ color: theme.subText }}
                          className="text-[11px] font-medium"
                        >
                          {specialtyText} · {locationText}
                        </Text>
                      </Pressable>
                    );
                  }
                )
              : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function WeekTimelineView({
  selectedDateKey,
  todayKey,
  currentMinutes,
  groupedAppointments,
  onSelectDayForTimeline,
  onSelectAppointment,
}: {
  selectedDateKey: string;
  todayKey: string;
  currentMinutes: number;
  groupedAppointments: Record<string, DoctorAppointment[]>;
  onSelectDayForTimeline: (dateKey: string) => void;
  onSelectAppointment: (item: DoctorAppointment) => void;
}) {
  const weekDays = useMemo(
    () => getWeekDays(selectedDateKey, todayKey),
    [selectedDateKey, todayKey]
  );

  const weekAppointments = useMemo(
    () => weekDays.flatMap((day) => groupedAppointments[day.dateKey] ?? []),
    [groupedAppointments, weekDays]
  );

  const { startHour, endHour, hours } = useMemo(
    () => computeTimelineHourRange(weekAppointments, 7, 20),
    [weekAppointments]
  );

  const totalHeight = hours.length * WEEK_HOUR_HEIGHT;
  const minTimelineMinutes = startHour * 60;
  const maxTimelineMinutes = (endHour + 1) * 60;
  const showNowLine =
    currentMinutes >= minTimelineMinutes &&
    currentMinutes <= maxTimelineMinutes;
  const nowTop =
    ((currentMinutes - minTimelineMinutes) / 60) * WEEK_HOUR_HEIGHT;

  return (
    <View
      style={styles.cardShadow}
      className="overflow-hidden rounded-3xl border border-[#eef2f4] bg-white"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row border-b border-[#e6ecee] bg-[#f8fbfb] py-2.5">
            <View style={{ width: WEEK_GUTTER_WIDTH }} />
            {weekDays.map((day) => {
              const isSelected = day.dateKey === selectedDateKey;
              return (
                <Pressable
                  key={day.dateKey}
                  onPress={() => onSelectDayForTimeline(day.dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.shortLabel}, dia ${day.day}. Abrir visão do dia`}
                  accessibilityState={{ selected: isSelected }}
                  style={{ width: WEEK_DAY_COL_WIDTH }}
                  className="min-h-[54px] items-center justify-center gap-1 px-1 active:opacity-80"
                >
                  <Text
                    className={`text-[11px] font-semibold ${
                      day.isToday || isSelected
                        ? "text-[#0e706f]"
                        : "text-[#6b7280]"
                    }`}
                  >
                    {day.shortLabel}
                  </Text>
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      day.isToday
                        ? "bg-[#0e706f]"
                        : isSelected
                          ? "border-2 border-[#0e706f] bg-[#dff4f2]"
                          : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        day.isToday
                          ? "text-white"
                          : isSelected
                            ? "text-[#004959]"
                            : "text-[#1f2d33]"
                      }`}
                    >
                      {day.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: totalHeight }} className="flex-row">
            <View style={{ width: WEEK_GUTTER_WIDTH }}>
              {hours.map((hour) => (
                <View
                  key={hour}
                  style={{ height: WEEK_HOUR_HEIGHT }}
                  className="items-end pr-2 pt-0.5"
                >
                  <Text className="text-[10px] font-semibold text-[#6b7280]">
                    {formatHourLabel(hour)}
                  </Text>
                </View>
              ))}
            </View>

            {weekDays.map((day) => {
              const dayItems = groupedAppointments[day.dateKey] ?? [];
              const positioned = assignOverlapColumns(dayItems, 50);

              return (
                <View
                  key={day.dateKey}
                  style={{ width: WEEK_DAY_COL_WIDTH }}
                  className={`relative border-l border-[#eef2f4] ${
                    day.dateKey === selectedDateKey ? "bg-[#f8fbfb]" : "bg-white"
                  }`}
                >
                  {hours.map((hour) => (
                    <View
                      key={hour}
                      style={{ height: WEEK_HOUR_HEIGHT }}
                      className="border-t border-[#e6ecee]"
                    />
                  ))}

                  {day.isToday && showNowLine ? (
                    <View
                      pointerEvents="none"
                      style={{ top: nowTop }}
                      className="absolute left-0 right-0 z-20 h-[2px] bg-[#dc2626]"
                    />
                  ) : null}

                  {positioned.map(
                    ({ item, startMinutes, column, totalColumns }) => {
                      const theme = getEventTheme(item);
                      const top = Math.max(
                        2,
                        ((startMinutes - minTimelineMinutes) / 60) *
                          WEEK_HOUR_HEIGHT
                      );
                      const colWidth = WEEK_DAY_COL_WIDTH / totalColumns;
                      const left = column * colWidth + 2;
                      const width = Math.max(42, colWidth - 4);
                      const timeStr = formatTime(item.dateTime);
                      const firstName =
                        item.patientName.trim().split(/\s+/)[0] ??
                        item.patientName;

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => onSelectAppointment(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Atendimento às ${timeStr} com ${item.patientName}`}
                          style={{
                            position: "absolute",
                            top,
                            left,
                            width,
                            minHeight: 48,
                            backgroundColor: theme.bg,
                            borderLeftWidth: 3,
                            borderLeftColor: theme.accent,
                            borderRadius: 10,
                            paddingHorizontal: 6,
                            paddingVertical: 5,
                          }}
                          className="justify-center active:opacity-85"
                        >
                          <Text
                            numberOfLines={1}
                            style={{ color: theme.subText }}
                            className="text-[10px] font-bold"
                          >
                            {timeStr}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{ color: theme.titleText }}
                            className="text-xs font-bold"
                          >
                            {firstName}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MonthCalendarView({
  selectedDateKey,
  todayKey,
  groupedAppointments,
  onSelectDate,
  onSwitchToDay,
  onSelectAppointment,
}: {
  selectedDateKey: string;
  todayKey: string;
  groupedAppointments: Record<string, DoctorAppointment[]>;
  onSelectDate: (dateKey: string) => void;
  onSwitchToDay: (dateKey: string) => void;
  onSelectAppointment: (item: DoctorAppointment) => void;
}) {
  const { year, month } = parseDateKey(selectedDateKey);
  const weeks = useMemo(
    () => getMonthCalendarGrid(year, month, todayKey),
    [year, month, todayKey]
  );

  const selectedDayItems = groupedAppointments[selectedDateKey] ?? [];
  const selectedDayHeading = describeDayHeading(selectedDateKey);

  return (
    <View className="gap-5">
      <View
        style={styles.cardShadow}
        className="rounded-3xl border border-[#eef2f4] bg-white p-4"
      >
        <View className="mb-2 flex-row">
          {WEEKDAY_INITIALS.map((initial, index) => (
            <View key={index} className="flex-1 items-center py-1">
              <Text className="text-xs font-bold text-[#6b7280]">{initial}</Text>
            </View>
          ))}
        </View>

        <View className="gap-1">
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row gap-1">
              {week.map((cell) => {
                const isSelected = cell.dateKey === selectedDateKey;
                const dayEvents = groupedAppointments[cell.dateKey] ?? [];
                const visibleEvents = dayEvents.slice(0, 2);
                const extraCount = dayEvents.length - visibleEvents.length;

                return (
                  <Pressable
                    key={cell.dateKey}
                    onPress={() => onSelectDate(cell.dateKey)}
                    accessibilityRole="button"
                    accessibilityLabel={`Dia ${cell.day}, ${dayEvents.length} ${dayEvents.length === 1 ? "atendimento" : "atendimentos"}`}
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-[60px] flex-1 items-center rounded-2xl border p-1 active:opacity-80 ${
                      isSelected
                        ? "border-[#0e706f] bg-[#dff4f2]"
                        : "border-transparent bg-transparent"
                    }`}
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-full ${
                        cell.isToday ? "bg-[#0e706f]" : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          cell.isToday
                            ? "text-white"
                            : cell.isCurrentMonth
                              ? isSelected
                                ? "text-[#004959]"
                                : "text-[#1f2d33]"
                              : "text-[#9ca3af]"
                        }`}
                      >
                        {cell.day}
                      </Text>
                    </View>

                    <View className="mt-1 w-full gap-0.5">
                      {visibleEvents.map((ev) => {
                        const theme = getEventTheme(ev);
                        return (
                          <View
                            key={ev.id}
                            style={{
                              backgroundColor: theme.bg,
                              borderLeftWidth: 2,
                              borderLeftColor: theme.accent,
                            }}
                            className="rounded px-1 py-0.5"
                          >
                            <Text
                              numberOfLines={1}
                              style={{ color: theme.titleText }}
                              className="text-[9px] font-bold"
                            >
                              {formatTime(ev.dateTime)}
                            </Text>
                          </View>
                        );
                      })}
                      {extraCount > 0 ? (
                        <Text className="text-center text-[9px] font-bold text-[#0e706f]">
                          +{extraCount}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-[#004959]">
              Atendimentos do dia selecionado
            </Text>
            <Text className="text-xs font-medium text-[#0e706f]">
              {selectedDayHeading}
            </Text>
          </View>

          <Pressable
            onPress={() => onSwitchToDay(selectedDateKey)}
            accessibilityRole="button"
            accessibilityLabel="Ver linha do tempo do dia"
            className="min-h-[48px] items-center justify-center rounded-2xl border border-[#0e706f] bg-white px-3.5 py-2 active:opacity-80"
          >
            <Text className="text-xs font-bold text-[#0e706f]">
              Ver linha do tempo do dia
            </Text>
          </Pressable>
        </View>

        {selectedDayItems.length === 0 ? (
          <View className="rounded-2xl border border-[#e6ecee] bg-white p-4">
            <Text className="text-sm font-semibold text-[#4b5563]">
              Nenhum atendimento agendado para esta data.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {selectedDayItems.map((item) => {
              const theme = getEventTheme(item);
              const timeStr = formatTime(item.dateTime);
              const specialtyText =
                item.specialty ?? item.reason ?? "Consulta";
              const locationText = item.hospitalName ?? CLINIC_INFO.unitLabel;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectAppointment(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Atendimento às ${timeStr} com ${item.patientName}, ${specialtyText}`}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: theme.accent,
                  }}
                  className="min-h-[68px] flex-row items-center justify-between gap-3 rounded-2xl border border-[#eef2f4] bg-white p-4 active:opacity-85"
                >
                  <View className="min-w-0 flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-[#0e706f]">
                        {timeStr} · {getPeriod(item.dateTime)}
                      </Text>
                      <View
                        style={{ backgroundColor: theme.bg }}
                        className="rounded-full px-2 py-0.5"
                      >
                        <Text
                          style={{ color: theme.titleText }}
                          className="text-[10px] font-bold"
                        >
                          {theme.statusLabel}
                        </Text>
                      </View>
                    </View>
                    <Text
                      numberOfLines={1}
                      className="text-base font-bold text-[#004959]"
                    >
                      {item.patientName}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-[#6b7280]">
                      {specialtyText} · {locationText}
                    </Text>
                  </View>

                  <ChevronRightIcon />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// Tela de agenda do medico com visualizacoes por Dia, Semana e Mes no fuso America/Recife.
export function DoctorScheduleScreen(_props: Props) {
  const logout = useAuthStore((s) => s.logout);
  const localAppointments = useAdminStore((s) => s.localAppointments);
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = FLOATING_TAB_BAR_SCROLL_OFFSET + insets.bottom;

  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getTodayKeyRecife()
  );
  const [currentMinutes, setCurrentMinutes] = useState<number>(() =>
    getCurrentMinutesRecife()
  );

  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [detailTarget, setDetailTarget] = useState<DoctorAppointment | null>(
    null
  );
  const [preChartTarget, setPreChartTarget] =
    useState<DoctorAppointment | null>(null);
  const [prescriptionTarget, setPrescriptionTarget] =
    useState<DoctorAppointment | null>(null);
  const [sentNotice, setSentNotice] = useState("");

  const modalTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const loadSchedule = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    }
    setErrorMessage("");
    try {
      const list = await doctorService.listSchedule();
      setAppointments(list);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Não foi possível carregar sua agenda.")
      );
      setStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCurrentMinutes(getCurrentMinutesRecife());
      void loadSchedule();
    }, [loadSchedule])
  );

  useEffect(() => {
    void loadSchedule(true);
  }, [localAppointments, loadSchedule]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentMinutesRecife());
    }, 60 * 1000);
    return () => {
      clearInterval(interval);
      if (modalTransitionTimerRef.current) {
        clearTimeout(modalTransitionTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentMinutes(getCurrentMinutesRecife());
    try {
      await loadSchedule(true);
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

  const openModalAfterDetailClose = (
    target: DoctorAppointment,
    opener: (appt: DoctorAppointment) => void
  ) => {
    setDetailTarget(null);
    if (modalTransitionTimerRef.current) {
      clearTimeout(modalTransitionTimerRef.current);
    }
    modalTransitionTimerRef.current = setTimeout(() => {
      opener(target);
    }, 120);
  };

  const todayKey = getTodayKeyRecife();
  const groupedAppointments = useMemo(
    () => groupAppointmentsByDate(appointments),
    [appointments]
  );
  const periodTitle = useMemo(
    () => formatPeriodTitle(selectedDateKey, viewMode),
    [selectedDateKey, viewMode]
  );
  const detailTheme = detailTarget ? getEventTheme(detailTarget) : null;

  return (
    <View className="flex-1 bg-[#f8fbfb]">
      <AppScreenHeader
        title="Agenda"
        subtitle="Acompanhe seus atendimentos por dia, semana ou mês."
        onLogoutPress={() => {
          void handleLogout();
        }}
        logoutDisabled={loggingOut}
        icon={<CalendarIcon color="#0e706f" size={28} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-4 px-5 pt-5"
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
        <View
          style={styles.cardShadow}
          className="gap-3.5 rounded-3xl border border-[#eef2f4] bg-white p-3.5"
        >
          <View
            accessibilityRole="tablist"
            className="flex-row gap-1.5 rounded-2xl bg-[#f3f7f7] p-1"
          >
            {VIEW_MODES.map((mode) => {
              const selected = viewMode === mode.key;
              return (
                <Pressable
                  key={mode.key}
                  onPress={() => setViewMode(mode.key)}
                  accessibilityRole="tab"
                  accessibilityLabel={`Visualizar por ${mode.label}`}
                  accessibilityState={{ selected }}
                  className={`min-h-[48px] flex-1 items-center justify-center rounded-xl px-3 py-2 active:opacity-85 ${
                    selected ? "bg-[#0e706f]" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      selected ? "text-white" : "text-[#004959]"
                    }`}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() =>
                  setSelectedDateKey((current) =>
                    shiftReferenceDate(current, viewMode, -1)
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Período anterior"
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-[#f3f7f7] active:opacity-80"
              >
                <ChevronLeftIcon />
              </Pressable>

              <Pressable
                onPress={() =>
                  setSelectedDateKey((current) =>
                    shiftReferenceDate(current, viewMode, 1)
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Próximo período"
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-[#f3f7f7] active:opacity-80"
              >
                <ChevronRightIcon />
              </Pressable>
            </View>

            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-center text-sm font-bold capitalize text-[#004959]"
            >
              {periodTitle}
            </Text>

            <Pressable
              onPress={() => {
                setSelectedDateKey(getTodayKeyRecife());
                setCurrentMinutes(getCurrentMinutesRecife());
              }}
              accessibilityRole="button"
              accessibilityLabel="Ir para hoje"
              className="min-h-[48px] items-center justify-center rounded-2xl border-[1.5px] border-[#0e706f] bg-white px-3.5 py-2 active:opacity-80"
            >
              <Text className="text-xs font-bold text-[#0e706f]">Hoje</Text>
            </Pressable>
          </View>
        </View>

        {sentNotice ? (
          <View
            accessibilityRole="alert"
            className="rounded-2xl border border-[#0e706f]/30 bg-[#dff4f2] px-4 py-3.5"
          >
            <Text className="text-sm font-semibold text-[#004959]">
              {sentNotice}
            </Text>
          </View>
        ) : null}

        {status === "loading" ? (
          <View
            style={styles.cardShadow}
            className="min-h-[160px] items-center justify-center gap-3 rounded-3xl border border-[#eef2f4] bg-white p-6"
          >
            <ActivityIndicator size="large" color="#0e706f" />
            <Text className="text-sm text-[#6b7280]">
              Carregando sua agenda...
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View
            style={styles.cardShadow}
            className="gap-4 rounded-3xl border border-[#eef2f4] bg-white p-5"
          >
            <Text className="text-base font-semibold text-[#004959]">
              {errorMessage || "Não foi possível carregar sua agenda."}
            </Text>
            <Button
              label="Tentar novamente"
              variant="outline"
              onPress={() => {
                void loadSchedule();
              }}
            />
          </View>
        ) : null}

        {status === "ready" && viewMode === "day" ? (
          <DayTimelineView
            dateKey={selectedDateKey}
            todayKey={todayKey}
            currentMinutes={currentMinutes}
            appointments={groupedAppointments[selectedDateKey] ?? []}
            onSelectAppointment={(item) => setDetailTarget(item)}
          />
        ) : null}

        {status === "ready" && viewMode === "week" ? (
          <WeekTimelineView
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            currentMinutes={currentMinutes}
            groupedAppointments={groupedAppointments}
            onSelectDayForTimeline={(dateKey) => {
              setSelectedDateKey(dateKey);
              setViewMode("day");
            }}
            onSelectAppointment={(item) => setDetailTarget(item)}
          />
        ) : null}

        {status === "ready" && viewMode === "month" ? (
          <MonthCalendarView
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            groupedAppointments={groupedAppointments}
            onSelectDate={(dateKey) => setSelectedDateKey(dateKey)}
            onSwitchToDay={(dateKey) => {
              setSelectedDateKey(dateKey);
              setViewMode("day");
            }}
            onSelectAppointment={(item) => setDetailTarget(item)}
          />
        ) : null}
      </ScrollView>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Detalhes do atendimento"
        closeLabel="Fechar detalhes do atendimento"
      >
        {detailTarget && detailTheme ? (
          <View className="gap-4">
            <View className="gap-2 rounded-2xl border border-[#e6ecee] bg-[#f8fbfb] p-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Paciente
                </Text>
                <View
                  style={{ backgroundColor: detailTheme.bg }}
                  className="rounded-full px-2.5 py-0.5"
                >
                  <Text
                    style={{ color: detailTheme.titleText }}
                    className="text-xs font-bold"
                  >
                    {detailTheme.statusLabel}
                  </Text>
                </View>
              </View>

              <Text className="text-lg font-bold text-[#004959]">
                {detailTarget.patientName}
              </Text>

              <Text className="text-sm font-semibold text-[#0e706f]">
                {formatLongDate(detailTarget.dateTime)} ·{" "}
                {formatTime(detailTarget.dateTime)} (
                {getPeriod(detailTarget.dateTime)})
              </Text>

              <Text className="text-sm text-[#4b5563]">
                Especialidade:{" "}
                {detailTarget.specialty ?? detailTarget.reason ?? "Consulta"}
              </Text>

              <Text className="text-sm text-[#4b5563]">
                Local: {detailTarget.hospitalName ?? CLINIC_INFO.unitLabel}
              </Text>
              <Text className="text-xs text-[#6b7280]">
                {detailTarget.hospitalAddress ?? CLINIC_INFO.address}
              </Text>
            </View>

            <View className="gap-2.5">
              <Pressable
                onPress={() =>
                  openModalAfterDetailClose(detailTarget, setPreChartTarget)
                }
                accessibilityRole="button"
                accessibilityLabel={`Ver pré-prontuário de ${detailTarget.patientName}`}
                className="min-h-[48px] w-full items-center justify-center rounded-2xl border-[1.5px] border-[#0e706f] bg-white px-4 py-3 active:opacity-80"
              >
                <Text className="text-sm font-bold text-[#0e706f]">
                  Ver pré-prontuário
                </Text>
              </Pressable>

              <Button
                label="Enviar receita"
                accessibilityLabel={`Enviar receita para ${detailTarget.patientName}`}
                onPress={() =>
                  openModalAfterDetailClose(detailTarget, (appt) => {
                    setSentNotice("");
                    setPrescriptionTarget(appt);
                  })
                }
              />
            </View>
          </View>
        ) : null}
      </Modal>

      <PatientPreChartModal
        appointment={preChartTarget}
        onClose={() => setPreChartTarget(null)}
      />

      <SendPrescriptionModal
        appointment={prescriptionTarget}
        onClose={() => setPrescriptionTarget(null)}
        onSent={(created) => {
          setPrescriptionTarget(null);
          setSentNotice(
            `Receita de ${created.medicationName} (${created.dosageMg}) enviada para ${created.patientName}.`
          );
        }}
      />
    </View>
  );
}

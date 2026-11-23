import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import { BrandLogo, Button } from "@/components";
import { CLINIC_INFO } from "@/constants/clinic";
import type { PatientStackParamList } from "@/navigation/types";
import { formatLongDate, formatTime, getPeriod } from "@/utils/date";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientBookingConfirmed"
>;

const CHECK_ICON =
  require("../../assets/icons/check-icon.png") as ImageSourcePropType;

function ArrowLeftTealIcon() {
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
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function CheckWhiteIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function SummaryRow({
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
      className={`flex-row items-center justify-between gap-4 py-3 ${
        isLast ? "" : "border-b border-line/60"
      }`}
    >
      <Text className="w-28 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-bold text-ink">
        {value}
      </Text>
    </View>
  );
}

// Tela de confirmacao exibida apos o paciente concluir um novo agendamento.
export function PatientBookingConfirmedScreen({ navigation, route }: Props) {
  const {
    specialty,
    doctorName,
    doctorCrm,
    dateTime,
    hospitalName,
    hospitalAddress,
  } = route.params;
  const insets = useSafeAreaInsets();
  const androidTopFallback =
    Platform.OS === "android" && insets.top === 0
      ? (StatusBar.currentHeight ?? 0)
      : 0;
  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  const goToConsultations = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: "PatientTabs", params: { screen: "PatientConsultations" } },
      ],
    });
  };

  const goToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "PatientTabs", params: { screen: "PatientHome" } }],
    });
  };

  const doctorDisplay = doctorCrm ? `${doctorName} · CRM ${doctorCrm}` : doctorName;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#c6eceb",
        paddingTop: androidTopFallback,
      }}
      className="flex-1 bg-[#c6eceb]"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow bg-white"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <LinearGradient
          colors={["#c6eceb", "#dcf4f2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <Pressable
              onPress={goToHome}
              accessibilityRole="button"
              accessibilityLabel="Voltar para o início"
              className="min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white active:opacity-80"
            >
              <ArrowLeftTealIcon />
            </Pressable>

            <BrandLogo height={26} />
          </View>

          <View className="mt-4 flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                accessibilityRole="header"
                className="text-2xl font-bold leading-tight text-[#004959]"
              >
                Consulta confirmada
              </Text>
              <Text className="text-sm font-medium text-[#004959]/85">
                Seu agendamento foi realizado com sucesso.
              </Text>
            </View>

            <View className="h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/90">
              <Image
                source={CHECK_ICON}
                resizeMode="contain"
                style={{ width: 46, height: 46 }}
              />
            </View>
          </View>
        </LinearGradient>

        <View className="flex-1 gap-6 px-5 pt-6">
          <View className="gap-4 rounded-2xl bg-[#dff4f2] p-5">
            <View className="items-center gap-2.5">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0e706f]">
                <CheckWhiteIcon />
              </View>

              <Text className="text-center text-xl font-bold text-[#004959]">
                Agendamento confirmado
              </Text>
            </View>

            <View className="rounded-2xl border border-line/70 bg-white px-4 py-1">
              <SummaryRow
                label="Especialidade"
                value={specialty ?? "Consulta"}
              />
              <SummaryRow label="Médico" value={doctorDisplay} />
              <SummaryRow label="Data" value={formatLongDate(dateTime)} />
              <SummaryRow
                label="Horário"
                value={`${formatTime(dateTime)} · ${getPeriod(dateTime)}`}
              />
              <SummaryRow
                label="Local"
                value={hospitalName ?? CLINIC_INFO.name}
              />
              <SummaryRow
                label="Endereço"
                value={hospitalAddress ?? CLINIC_INFO.address}
                isLast
              />
            </View>
          </View>

          <View className="mt-auto gap-3">
            <Button
              label="Ver minhas consultas"
              variant="primary"
              accessibilityLabel="Ver minhas consultas"
              onPress={goToConsultations}
            />

            <Button
              label="Voltar para o início"
              variant="outline"
              accessibilityLabel="Voltar para o início"
              onPress={goToHome}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

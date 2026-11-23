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

import { Button } from "@/components";
import type { PatientStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<
  PatientStackParamList,
  "PatientAppointmentCanceled"
>;

const ICON_CONSULTAS =
  require("../../assets/icons/icone-consultas.png") as ImageSourcePropType;

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

// Tela exibida apos cancelar uma consulta com atalhos para novo agendamento ou agenda.
export function PatientAppointmentCanceledScreen({ navigation }: Props) {
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

  const goToSchedule = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "PatientTabs", params: { screen: "PatientSchedule" } }],
    });
  };

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
          <Pressable
            onPress={goToConsultations}
            accessibilityRole="button"
            accessibilityLabel="Voltar para consultas"
            className="min-h-[48px] min-w-[48px] self-start items-center justify-center rounded-full bg-white active:opacity-80"
          >
            <ArrowLeftTealIcon />
          </Pressable>

          <View className="mt-4 flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                accessibilityRole="header"
                className="text-2xl font-bold leading-tight text-[#004959]"
              >
                Agendamento cancelado
              </Text>
              <Text className="text-sm font-medium text-[#004959]/85">
                O horário foi liberado com sucesso.
              </Text>
            </View>

            <View className="h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/90">
              <Image
                source={ICON_CONSULTAS}
                resizeMode="contain"
                style={{ width: 48, height: 48 }}
              />
            </View>
          </View>
        </LinearGradient>

        <View className="flex-1 gap-6 px-5 pt-6">
          <View className="items-center gap-3 rounded-2xl bg-[#dff4f2] p-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0e706f]">
              <Text className="text-xl font-bold text-white">i</Text>
            </View>

            <Text className="text-center text-xl font-bold text-[#004959]">
              Consulta cancelada
            </Text>

            <Text className="text-center text-sm leading-relaxed text-slate-700">
              Você pode marcar uma nova consulta quando quiser.
            </Text>
          </View>

          <View className="mt-auto gap-3">
            <Button
              label="Marcar outra consulta"
              variant="primary"
              accessibilityLabel="Marcar outra consulta"
              onPress={goToSchedule}
            />

            <Button
              label="Voltar para a agenda"
              variant="outline"
              accessibilityLabel="Voltar para a agenda"
              onPress={goToConsultations}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

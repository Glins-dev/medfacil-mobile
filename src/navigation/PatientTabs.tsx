import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PatientConsultationsScreen } from "@/screens/PatientConsultationsScreen";
import { PatientHomeScreen } from "@/screens/PatientHomeScreen";
import { createPlaceholderScreen } from "@/screens/PlaceholderScreen";
import { CalendarIcon, HomeIcon, StethoscopeIcon } from "./icons";
import type { PatientTabParamList } from "./types";

const Tab = createBottomTabNavigator<PatientTabParamList>();
const AgendaScreen = createPlaceholderScreen("Agendamentos");

const TAB_BAR_BASE_HEIGHT = 60;

// Navegacao inferior do paciente ajustada para a area segura dos dispositivos.
export function PatientTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0e706f",
        tabBarInactiveTintColor: "#5f6b6f",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarItemStyle: { minHeight: 44 },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d9d4c7",
          height: TAB_BAR_BASE_HEIGHT + bottomInset,
          paddingBottom: bottomInset + 4,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="PatientConsultations"
        component={PatientConsultationsScreen}
        options={{
          title: "Consultas",
          tabBarIcon: ({ color }) => <StethoscopeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="PatientAgenda"
        component={AgendaScreen}
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "@/components/ui";
import { DoctorHomeScreen } from "@/screens/DoctorHomeScreen";
import { createPlaceholderScreen } from "@/screens/PlaceholderScreen";
import { CalendarIcon, HomeIcon } from "./icons";
import type { DoctorTabParamList } from "./types";

const Tab = createBottomTabNavigator<DoctorTabParamList>();
const AgendaScreen = createPlaceholderScreen("Agenda", {
  subtitle: "Visualize e gerencie seus horários em breve.",
  icon: <CalendarIcon color="#0e706f" size={28} />,
});

// Navegacao inferior flutuante do medico alinhada a identidade visual do paciente.
export function DoctorTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="DoctorHome"
        component={DoctorHomeScreen}
        options={{
          title: "Início",
          tabBarAccessibilityLabel: "Início do médico",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorAgenda"
        component={AgendaScreen}
        options={{
          title: "Agenda",
          tabBarAccessibilityLabel: "Agenda do médico",
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

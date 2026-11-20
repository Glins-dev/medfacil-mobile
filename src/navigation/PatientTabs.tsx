import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { PatientHomeScreen } from "@/screens/PatientHomeScreen";
import { createPlaceholderScreen } from "@/screens/PlaceholderScreen";
import { CalendarIcon, HomeIcon, StethoscopeIcon } from "./icons";
import type { PatientTabParamList } from "./types";
import { useTabScreenOptions } from "./useTabScreenOptions";

const Tab = createBottomTabNavigator<PatientTabParamList>();
const ConsultationsScreen = createPlaceholderScreen("Consultas");
const AgendaScreen = createPlaceholderScreen("Agendamentos");

export function PatientTabs() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{ title: "Início", tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="PatientConsultations"
        component={ConsultationsScreen}
        options={{ title: "Consultas", tabBarIcon: ({ color }) => <StethoscopeIcon color={color} /> }}
      />
      <Tab.Screen
        name="PatientAgenda"
        component={AgendaScreen}
        options={{ title: "Agenda", tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}

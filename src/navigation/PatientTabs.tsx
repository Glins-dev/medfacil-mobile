import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "@/components/ui";
import { PatientConsultationsScreen } from "@/screens/PatientConsultationsScreen";
import { PatientHomeScreen } from "@/screens/PatientHomeScreen";
import { PatientProfileScreen } from "@/screens/PatientProfileScreen";
import { PatientScheduleScreen } from "@/screens/PatientScheduleScreen";
import {
  CalendarIcon,
  HomeIcon,
  StethoscopeIcon,
  UserIcon,
} from "./icons";
import type { PatientTabParamList } from "./types";

const Tab = createBottomTabNavigator<PatientTabParamList>();

// Navegacao inferior flutuante do paciente alinhada ao mockup oficial.
export function PatientTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientConsultations"
        component={PatientConsultationsScreen}
        options={{
          title: "Consultas",
          tabBarIcon: ({ color, size }) => (
            <StethoscopeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientSchedule"
        component={PatientScheduleScreen}
        options={{
          title: "Agenda",
          tabBarAccessibilityLabel: "Agenda, agendar consulta",
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientProfile"
        component={PatientProfileScreen}
        options={{
          title: "Perfil",
          tabBarAccessibilityLabel: "Perfil do paciente",
          tabBarIcon: ({ color, size }) => (
            <UserIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

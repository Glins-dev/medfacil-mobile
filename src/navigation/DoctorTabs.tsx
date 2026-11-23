import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "@/components/ui";
import { DoctorHomeScreen } from "@/screens/DoctorHomeScreen";
import { DoctorHospitalsScreen } from "@/screens/DoctorHospitalsScreen";
import { DoctorScheduleScreen } from "@/screens/DoctorScheduleScreen";
import { CalendarIcon, HomeIcon, HospitalIcon } from "./icons";
import type { DoctorTabParamList } from "./types";

const Tab = createBottomTabNavigator<DoctorTabParamList>();

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
        name="DoctorHospitals"
        component={DoctorHospitalsScreen}
        options={{
          title: "Hospitais",
          tabBarAccessibilityLabel: "Hospitais vinculados",
          tabBarIcon: ({ color, size }) => (
            <HospitalIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorSchedule"
        component={DoctorScheduleScreen}
        options={{
          title: "Agenda",
          tabBarAccessibilityLabel: "Agenda de atendimentos",
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { FloatingTabBar } from "@/components/ui";
import { AdminHomeScreen } from "@/screens/AdminHomeScreen";
import { AdminNewDoctorScreen } from "@/screens/AdminNewDoctorScreen";
import { HomeIcon, StethoscopeIcon } from "./icons";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

// Navegacao inferior flutuante do administrador alinhada a identidade visual do paciente.
export function AdminTabs() {
  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{
          title: "Início",
          tabBarAccessibilityLabel: "Painel administrativo",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminDoctors"
        component={AdminNewDoctorScreen}
        options={{
          title: "Médicos",
          tabBarAccessibilityLabel: "Cadastro de médicos",
          tabBarIcon: ({ color, size }) => (
            <StethoscopeIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

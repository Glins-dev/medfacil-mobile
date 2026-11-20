import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminHomeScreen } from "@/screens/AdminHomeScreen";
import { AdminNewDoctorScreen } from "@/screens/AdminNewDoctorScreen";
import { HomeIcon, StethoscopeIcon } from "./icons";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TAB_BAR_BASE_HEIGHT = 60;

// Navegacao inferior do administrador ajustada para a area segura dos dispositivos.
export function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0e706f",
        tabBarInactiveTintColor: "#5f6b6f",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarItemStyle: { minHeight: 48 },
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
        name="AdminHome"
        component={AdminHomeScreen}
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminDoctors"
        component={AdminNewDoctorScreen}
        options={{
          title: "Médicos",
          tabBarIcon: ({ color }) => <StethoscopeIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

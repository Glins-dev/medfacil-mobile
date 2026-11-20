import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { AdminHomeScreen } from "@/screens/AdminHomeScreen";
import { createPlaceholderScreen } from "@/screens/PlaceholderScreen";
import { HomeIcon, StethoscopeIcon } from "./icons";
import type { AdminTabParamList } from "./types";
import { useTabScreenOptions } from "./useTabScreenOptions";

const Tab = createBottomTabNavigator<AdminTabParamList>();
const DoctorsScreen = createPlaceholderScreen("Médicos");

export function AdminTabs() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: "Início", tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="AdminDoctors"
        component={DoctorsScreen}
        options={{ title: "Médicos", tabBarIcon: ({ color }) => <StethoscopeIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}

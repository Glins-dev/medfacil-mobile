import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { DoctorHomeScreen } from "@/screens/DoctorHomeScreen";
import { createPlaceholderScreen } from "@/screens/PlaceholderScreen";
import { CalendarIcon, HomeIcon } from "./icons";
import type { DoctorTabParamList } from "./types";
import { useTabScreenOptions } from "./useTabScreenOptions";

const Tab = createBottomTabNavigator<DoctorTabParamList>();
const AgendaScreen = createPlaceholderScreen("Agenda");

export function DoctorTabs() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="DoctorHome"
        component={DoctorHomeScreen}
        options={{ title: "Início", tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="DoctorAgenda"
        component={AgendaScreen}
        options={{ title: "Agenda", tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}

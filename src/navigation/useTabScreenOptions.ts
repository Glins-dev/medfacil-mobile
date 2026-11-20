import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_CONTENT_HEIGHT = 60;

// Opcoes comuns das Bottom Tabs somando a area segura inferior dos dispositivos.
export function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return {
    headerShown: false,
    tabBarActiveTintColor: "#0e706f",
    tabBarInactiveTintColor: "#5f6b6f",
    tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
    tabBarItemStyle: { minHeight: 48 },
    tabBarStyle: {
      backgroundColor: "#ffffff",
      borderTopColor: "#d9d4c7",
      height: TAB_CONTENT_HEIGHT + bottomInset,
      paddingBottom: bottomInset + 4,
      paddingTop: 6,
    },
  };
}

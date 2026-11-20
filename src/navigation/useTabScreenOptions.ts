import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_CONTENT_HEIGHT = 60;

/**
 * Opções comuns das Bottom Tabs. O paddingBottom soma a área segura inferior
 * para a barra não ficar sob a barra de gestos / botões do Android.
 */
export function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();

  return {
    headerShown: false,
    tabBarActiveTintColor: "#0e706f",
    tabBarInactiveTintColor: "#5f6b6f",
    tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
    tabBarItemStyle: { minHeight: 44 },
    tabBarStyle: {
      backgroundColor: "#ffffff",
      borderTopColor: "#d9d4c7",
      height: TAB_CONTENT_HEIGHT + insets.bottom,
      paddingBottom: insets.bottom + 6,
      paddingTop: 6,
    },
  };
}

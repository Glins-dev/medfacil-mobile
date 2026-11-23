import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerContainer, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.card}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const tintColor = isFocused ? "#0e706f" : "#6b7280";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused ? styles.tabItemFocused : styles.tabItemIdle,
                pressed ? styles.tabItemPressed : undefined,
              ]}
            >
              <View style={styles.iconBox}>
                {options.tabBarIcon
                  ? options.tabBarIcon({
                    focused: isFocused,
                    color: tintColor,
                    size: 28,
                  })
                  : null}
              </View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelFocused : styles.tabLabelIdle,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    overflow: "visible",
    zIndex: 10,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eef2f4",
    padding: 6,
    shadowColor: "#004959",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: "100%",
    minHeight: 48,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tabItemFocused: {
    backgroundColor: "#e2f3f1",
  },
  tabItemIdle: {
    backgroundColor: "transparent",
  },
  tabItemPressed: {
    opacity: 0.8,
  },
  iconBox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
  },
  tabLabelFocused: {
    color: "#0e706f",
    fontWeight: "700",
  },
  tabLabelIdle: {
    color: "#6b7280",
    fontWeight: "500",
  },
});

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

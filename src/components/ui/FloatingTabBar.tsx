import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FLOATING_TAB_BAR_HEIGHT = 72;
export const FLOATING_TAB_BAR_MARGIN_BOTTOM = 16;
export const FLOATING_TAB_BAR_SCROLL_OFFSET =
  FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_MARGIN_BOTTOM + 24;

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
    marginBottom: FLOATING_TAB_BAR_MARGIN_BOTTOM,
    height: FLOATING_TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eef2f4",
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemPressed: {
    opacity: 0.8,
  },
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
    maxWidth: "100%",
    gap: 4,
  },
  tabPillFocused: {
    backgroundColor: "#e2f3f1",
  },
  tabPillIdle: {
    backgroundColor: "transparent",
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
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

// Barra de navegacao flutuante compartilhada pelos fluxos com BottomTabNavigator.
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
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
              : (options.title ?? route.name);
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
                pressed ? styles.tabItemPressed : undefined,
              ]}
            >
              <View
                style={[
                  styles.tabPill,
                  isFocused ? styles.tabPillFocused : styles.tabPillIdle,
                ]}
              >
                <View style={styles.iconBox}>
                  {options.tabBarIcon
                    ? options.tabBarIcon({
                        focused: isFocused,
                        color: tintColor,
                        size: 22,
                      })
                    : null}
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelFocused : styles.tabLabelIdle,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

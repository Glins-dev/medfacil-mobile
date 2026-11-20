import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Tela provisória das abas ainda não implementadas. */
export function createPlaceholderScreen(title: string) {
  return function PlaceholderScreen() {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        className="flex-1 bg-surface"
      >
        <View className="flex-1 justify-center px-6">
          <Text
            accessibilityRole="header"
            className="text-2xl font-bold text-brand-dark"
          >
            {title}
          </Text>
          <Text className="mt-2 text-base text-muted">
            Esta tela será implementada em uma próxima issue do backlog.
          </Text>
        </View>
      </SafeAreaView>
    );
  };
}

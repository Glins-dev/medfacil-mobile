import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}

function CloseIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1f2d33"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  );
}

// Painel inferior nativo (bottom sheet) com fechamento por toque externo e area segura inferior.
export function Modal({
  open,
  onClose,
  title,
  children,
  closeLabel = "Fechar modal",
}: ModalProps) {
  return (
    <RNModal
      visible={open}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          className="absolute inset-0 bg-ink/50"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            accessibilityViewIsModal
            className="rounded-t-3xl bg-white px-6 pt-5 shadow-xl"
          >
            <SafeAreaView edges={["bottom"]} className="pb-4">
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <Text
                  accessibilityRole="header"
                  className="flex-1 text-xl font-bold text-ink"
                >
                  {title}
                </Text>

                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  hitSlop={4}
                  className="min-h-[48px] min-w-[48px] items-center justify-center rounded-full active:bg-line/40"
                >
                  <CloseIcon />
                </Pressable>
              </View>

              <View>{children}</View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

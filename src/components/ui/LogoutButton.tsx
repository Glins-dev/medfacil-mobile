import { Pressable, StyleSheet, Text } from "react-native";

export interface LogoutButtonProps {
  onPress: () => void;
  disabled?: boolean;
  height?: number;
}

const DEFAULT_LOGOUT_HEIGHT = 26;
const MIN_ACCESSIBLE_TARGET = 48;

const styles = StyleSheet.create({
  button: {
    borderRadius: 9999,
    minWidth: 80,
    paddingHorizontal: 20,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: "#b91c1c",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: "center",
  },
});

// Botao reutilizavel de logout em pilula vermelha solida sincronizada a altura da logo.
export function LogoutButton({
  onPress,
  disabled = false,
  height = DEFAULT_LOGOUT_HEIGHT,
}: LogoutButtonProps) {
  const verticalHitSlop = Math.max(
    0,
    Math.ceil((MIN_ACCESSIBLE_TARGET - height) / 2)
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: verticalHitSlop, bottom: verticalHitSlop, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Sair da conta"
      accessibilityState={{ disabled, busy: disabled }}
      style={({ pressed }) => [
        styles.button,
        { height },
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text numberOfLines={1} style={styles.label}>
        Sair
      </Text>
    </Pressable>
  );
}

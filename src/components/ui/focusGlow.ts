import { Platform, StyleSheet } from "react-native";

export const fieldFocusStyles = StyleSheet.create({
  haloIdle: {
    borderWidth: 3,
    borderRadius: 19,
    borderColor: "transparent",
  },
  haloNeon: {
    borderWidth: 3,
    borderRadius: 19,
    borderColor: "rgba(45, 212, 191, 0.28)",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#2dd4bf",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.38,
          shadowRadius: 8,
        }
      : {}),
  },
  haloError: {
    borderWidth: 3,
    borderRadius: 19,
    borderColor: "rgba(220, 38, 38, 0.18)",
  },
  boxIdle: {
    borderWidth: 1.5,
    borderColor: "#dce5e7",
    backgroundColor: "#f9fcfc",
    borderRadius: 16,
  },
  boxNeon: {
    borderWidth: 1.5,
    borderColor: "#14b8a6",
    backgroundColor: "#ffffff",
    borderRadius: 16,
  },
  boxError: {
    borderWidth: 1.5,
    borderColor: "#dc2626",
    backgroundColor: "#ffffff",
    borderRadius: 16,
  },
});

// Calcula estilos de borda e halo neon para inputs e seletores dropdown.
export function getFieldFrameStyles({
  active,
  error = false,
}: {
  active: boolean;
  error?: boolean;
}) {
  if (error) {
    return {
      haloStyle: fieldFocusStyles.haloError,
      boxStyle: fieldFocusStyles.boxError,
    };
  }

  if (active) {
    return {
      haloStyle: fieldFocusStyles.haloNeon,
      boxStyle: fieldFocusStyles.boxNeon,
    };
  }

  return {
    haloStyle: fieldFocusStyles.haloIdle,
    boxStyle: fieldFocusStyles.boxIdle,
  };
}

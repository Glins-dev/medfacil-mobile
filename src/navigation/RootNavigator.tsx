import { ActivityIndicator, View } from "react-native";

import { AdminTabs } from "./AdminTabs";
import { AuthStack } from "./AuthStack";
import { DoctorTabs } from "./DoctorTabs";
import { PatientStack } from "./PatientStack";
import { useAuthStore } from "@/stores/auth.store";

// Navegacao condicional: aguarda hidratacao do SecureStore e decide entre Auth ou abas do perfil.
export function RootNavigator() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);

  if (!hasHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream">
        <ActivityIndicator size="large" color="#0e706f" />
      </View>
    );
  }

  if (!token || !role) return <AuthStack />;

  switch (role) {
    case "PACIENTE":
      return <PatientStack />;
    case "MEDICO":
      return <DoctorTabs />;
    case "ADMIN":
      return <AdminTabs />;
  }
}

import { AdminTabs } from "./AdminTabs";
import { AuthStack } from "./AuthStack";
import { DoctorTabs } from "./DoctorTabs";
import { PatientTabs } from "./PatientTabs";
import { useAuthStore } from "@/stores/auth.store";

/** Navegação condicional: sem sessão → Auth; com sessão → abas do perfil (role). */
export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);

  if (!token || !role) return <AuthStack />;

  switch (role) {
    case "PACIENTE":
      return <PatientTabs />;
    case "MEDICO":
      return <DoctorTabs />;
    case "ADMIN":
      return <AdminTabs />;
  }
}

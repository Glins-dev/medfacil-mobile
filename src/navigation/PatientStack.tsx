import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PatientAppointmentDetailsScreen } from "@/screens/PatientAppointmentDetailsScreen";
import { PatientConfirmAttendanceScreen } from "@/screens/PatientConfirmAttendanceScreen";
import { PatientTabs } from "./PatientTabs";
import type { PatientStackParamList } from "./types";

const Stack = createNativeStackNavigator<PatientStackParamList>();

// Stack principal do paciente contendo as abas inferiores e telas de detalhes/confirmacao.
export function PatientStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="PatientTabs" component={PatientTabs} />
      <Stack.Screen
        name="PatientAppointmentDetails"
        component={PatientAppointmentDetailsScreen}
      />
      <Stack.Screen
        name="PatientConfirmAttendance"
        component={PatientConfirmAttendanceScreen}
      />
    </Stack.Navigator>
  );
}

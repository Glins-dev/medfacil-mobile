import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PatientAppointmentCanceledScreen } from "@/screens/PatientAppointmentCanceledScreen";
import { PatientAppointmentDetailsScreen } from "@/screens/PatientAppointmentDetailsScreen";
import { PatientAttendanceConfirmedScreen } from "@/screens/PatientAttendanceConfirmedScreen";
import { PatientBookingConfirmedScreen } from "@/screens/PatientBookingConfirmedScreen";
import { PatientConfirmAttendanceScreen } from "@/screens/PatientConfirmAttendanceScreen";
import { PatientHealthScreen } from "@/screens/PatientHealthScreen";
import { PatientPrescriptionsScreen } from "@/screens/PatientPrescriptionsScreen";
import { PatientTabs } from "./PatientTabs";
import type { PatientStackParamList } from "./types";

const Stack = createNativeStackNavigator<PatientStackParamList>();

// Stack principal do paciente contendo as abas inferiores, detalhes e receitas.
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
      <Stack.Screen
        name="PatientAppointmentCanceled"
        component={PatientAppointmentCanceledScreen}
      />
      <Stack.Screen
        name="PatientAttendanceConfirmed"
        component={PatientAttendanceConfirmedScreen}
      />
      <Stack.Screen
        name="PatientBookingConfirmed"
        component={PatientBookingConfirmedScreen}
      />
      <Stack.Screen
        name="PatientPrescriptions"
        component={PatientPrescriptionsScreen}
      />
      <Stack.Screen
        name="PatientHealth"
        component={PatientHealthScreen}
      />
    </Stack.Navigator>
  );
}

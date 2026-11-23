import type { NavigatorScreenParams } from "@react-navigation/native";

export type UserRole = "PACIENTE" | "MEDICO" | "ADMIN";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type PatientTabParamList = {
  PatientHome: undefined;
  PatientConsultations: undefined;
  PatientSchedule: undefined;
  PatientProfile: undefined;
};

export type PatientStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined;
  PatientAppointmentDetails: { appointmentId: string };
  PatientConfirmAttendance: { appointmentId: string };
};

export type DoctorTabParamList = {
  DoctorHome: undefined;
  DoctorAgenda: undefined;
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminDoctors: undefined;
};

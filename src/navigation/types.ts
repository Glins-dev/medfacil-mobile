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

export interface BookingConfirmedParams {
  appointmentId: string;
  specialty: string | null;
  doctorName: string;
  doctorCrm?: string;
  dateTime: string;
}

export type PatientStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined;
  PatientAppointmentDetails: { appointmentId: string };
  PatientConfirmAttendance: { appointmentId: string };
  PatientAppointmentCanceled: undefined;
  PatientAttendanceConfirmed: { appointmentId: string };
  PatientBookingConfirmed: BookingConfirmedParams;
  PatientPrescriptions: undefined;
};

export type DoctorTabParamList = {
  DoctorHome: undefined;
  DoctorHospitals: undefined;
  DoctorAgenda: undefined;
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminDoctors: undefined;
  AdminHospitals: undefined;
  AdminSchedules: undefined;
};

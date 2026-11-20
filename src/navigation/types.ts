export type UserRole = "PACIENTE" | "MEDICO" | "ADMIN";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type PatientTabParamList = {
  PatientHome: undefined;
  PatientConsultations: undefined;
  PatientSchedule: undefined;
  PatientAgenda: undefined;
};

export type DoctorTabParamList = {
  DoctorHome: undefined;
  DoctorAgenda: undefined;
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminDoctors: undefined;
};

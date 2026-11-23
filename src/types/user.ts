export const USER_SEX_OPTIONS = [
  "Masculino",
  "Feminino",
  "Não informar",
] as const;

export type UserSex = (typeof USER_SEX_OPTIONS)[number];

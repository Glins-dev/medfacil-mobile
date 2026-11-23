import type { ImageSourcePropType } from "react-native";

export const MEDICAL_IMAGES = {
  doctor: require("../../assets/icons/medical/doctor.png") as ImageSourcePropType,
  prescription: require("../../assets/icons/medical/prescription.png") as ImageSourcePropType,
  heart: require("../../assets/icons/medical/heart.png") as ImageSourcePropType,
  stethoscope: require("../../assets/icons/medical/stethoscope.png") as ImageSourcePropType,
  bandage: require("../../assets/icons/medical/bandage.png") as ImageSourcePropType,
  brokenBone: require("../../assets/icons/medical/broken-bone.png") as ImageSourcePropType,
  lungs: require("../../assets/icons/medical/lungs.png") as ImageSourcePropType,
  dna: require("../../assets/icons/medical/dna.png") as ImageSourcePropType,
  tooth: require("../../assets/icons/medical/tooth.png") as ImageSourcePropType,
  stomach: require("../../assets/icons/medical/stomach.png") as ImageSourcePropType,
  kidneys: require("../../assets/icons/medical/kidneys.png") as ImageSourcePropType,
  liver: require("../../assets/icons/medical/liver.png") as ImageSourcePropType,
  otoscope: require("../../assets/icons/medical/otoscope.png") as ImageSourcePropType,
  firstAidKit: require("../../assets/icons/medical/first-aid-kit.png") as ImageSourcePropType,
  capsule: require("../../assets/icons/medical/capsule.png") as ImageSourcePropType,
  medicalChat: require("../../assets/icons/medical/medical-chat.png") as ImageSourcePropType,
  pregnancyTest: require("../../assets/icons/medical/pregnancy-test.png") as ImageSourcePropType,
};

function normalizeSpecialty(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const SPECIALTY_ICON_RULES: Array<{
  keywords: string[];
  image: ImageSourcePropType;
}> = [
  { keywords: ["cardio", "coracao"], image: MEDICAL_IMAGES.heart },
  { keywords: ["dermato", "pele"], image: MEDICAL_IMAGES.bandage },
  { keywords: ["ortoped", "osso", "traumat"], image: MEDICAL_IMAGES.brokenBone },
  { keywords: ["pneumo", "pulm"], image: MEDICAL_IMAGES.lungs },
  { keywords: ["neuro", "genet"], image: MEDICAL_IMAGES.dna },
  { keywords: ["odonto", "dent"], image: MEDICAL_IMAGES.tooth },
  { keywords: ["gastro", "nutri", "estom"], image: MEDICAL_IMAGES.stomach },
  { keywords: ["urolog", "nefro", "rim"], image: MEDICAL_IMAGES.kidneys },
  { keywords: ["hepat", "figado"], image: MEDICAL_IMAGES.liver },
  { keywords: ["otorrino", "ouvido"], image: MEDICAL_IMAGES.otoscope },
  { keywords: ["pediatr", "infantil"], image: MEDICAL_IMAGES.firstAidKit },
  { keywords: ["psico", "psiquiatr", "terap"], image: MEDICAL_IMAGES.medicalChat },
  { keywords: ["gineco", "obstet", "gestant"], image: MEDICAL_IMAGES.pregnancyTest },
  { keywords: ["farmac", "medicam"], image: MEDICAL_IMAGES.capsule },
];

// Seleciona a ilustracao 3D correspondente a especialidade com fallback para estetoscopio.
export function getSpecialtyImage(name?: string | null): ImageSourcePropType {
  if (!name) return MEDICAL_IMAGES.stethoscope;
  const normalized = normalizeSpecialty(name);
  const match = SPECIALTY_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );
  return match?.image ?? MEDICAL_IMAGES.stethoscope;
}

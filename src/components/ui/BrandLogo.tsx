import { Image, type ImageSourcePropType } from "react-native";

const LOGO_MEDFACIL =
  require("../../../assets/icons/logo-medfacil.png") as ImageSourcePropType;
const LOGO_ASPECT_RATIO = 2100 / 512;

export interface BrandLogoProps {
  height?: number;
  width?: number;
  className?: string;
}

// Logo oficial da marca com proporcao preservada e rotulo acessivel.
export function BrandLogo({ height = 28, width, className }: BrandLogoProps) {
  const resolvedHeight = height;
  const resolvedWidth = width ?? Math.round(resolvedHeight * LOGO_ASPECT_RATIO);

  return (
    <Image
      source={LOGO_MEDFACIL}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logo Medfácil"
      style={{ width: resolvedWidth, height: resolvedHeight }}
      className={className}
    />
  );
}

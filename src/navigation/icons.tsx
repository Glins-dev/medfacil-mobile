import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

const common = {
  fill: "none",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function StethoscopeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <Path d="M5 3h2M13 3h2" />
      <Path d="M10 13v1.5a4.5 4.5 0 0 0 9 0V13" />
      <Circle cx="19" cy="11" r="2" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  );
}

export function CalendarPlusIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
    </Svg>
  );
}

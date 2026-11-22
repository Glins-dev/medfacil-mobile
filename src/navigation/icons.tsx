import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

const common = {
  fill: "none",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Path d="M3.5 10.5 12 3.5l8.5 7" />
      <Path d="M5.5 9.5V19.5a1 1 0 0 0 1 1h3.5v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function StethoscopeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Path d="M6.2 4.2h2M13.2 4.2h2" />
      <Path d="M7.2 4.2v5a3.5 3.5 0 0 0 7 0v-5" />
      <Path d="M10.7 12.7v4.3a2.8 2.8 0 0 0 5.6 0v-0.4" />
      <Circle cx="16.3" cy="15" r="1.6" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...common}>
      <Rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <Path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
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

export function GridIcon({ color, size = 24 }: IconProps) {
  const coords = [6, 12, 18];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {coords.flatMap((cx) =>
        coords.map((cy) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.65" />)
      )}
    </Svg>
  );
}

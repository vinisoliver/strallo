import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Ícones e marca do strallo. Todos os traçados vêm da canvas de design —
 * mesmo viewBox, mesma espessura de traço — para o app bater com o mockup.
 */

type IconProps = {
  size?: number;
  color?: string;
};

/** Logotipo: a palavra "strallo" desenhada à mão. */
export function Logo({ width = 100, height = 34, color = colors.primary }) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="20 12 232 80"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M58 40 C49 33 33 35 33 46 C33 55 52 53 55 63 C57 72 42 75 30 68"
        strokeWidth={10}
      />
      <Path d="M70 24 C68 44 67 60 71 74 C73 80 79 79 83 75" strokeWidth={10} />
      <Path d="M54 43 C63 41 77 41 86 44" strokeWidth={8.5} />
      <Path d="M96 44 C95 55 95 64 97 74" strokeWidth={10} />
      <Path d="M96 49 C100 43 108 42 114 47" strokeWidth={9} />
      <Path d="M144 45 C143 55 143 64 146 74" strokeWidth={10} />
      <Path
        d="M144 50 C136 45 124 49 124 58 C124 67 135 71 145 66"
        strokeWidth={10}
      />
      <Path
        d="M156 24 C155 44 154 62 158 74 C160 80 166 79 170 75"
        strokeWidth={10}
      />
      <Path
        d="M180 24 C179 44 178 62 182 74 C184 80 190 79 194 75"
        strokeWidth={10}
      />
      <Path
        d="M213 44 C222 44 228 51 227 58 C226 66 219 71 211 70 C203 69 198 63 198 56 C199 49 205 44 213 44"
        strokeWidth={10}
      />
    </Svg>
  );
}

/** Pilha de cartões — acompanha o total no cabeçalho. */
export function StackIcon({ size = 18, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={8.5}
        y={3.5}
        width={11}
        height={15}
        rx={2.5}
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={4.5}
        y={6.5}
        width={11}
        height={15}
        rx={2.5}
        fill={colors.bg}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

export function SearchIcon({ size = 20, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2.4} />
      <Path
        d="M20 20l-3.2-3.2"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 30, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PencilIcon({ size = 20, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path d="M13 6l5 5" stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color = colors.danger }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 15, color = colors.onPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackIcon({ size = 22, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size = 22, color = colors.onPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z" />
    </Svg>
  );
}

export function StarIcon({ size = 15, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l2.2 5.6L20 9l-4.5 3.6L17 19l-5-3.2L7 19l1.5-6.4L4 9l5.8-.4L12 3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

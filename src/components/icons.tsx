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

/** Traçado da pasta — o mesmo em todas as variantes do ícone de coleção. */
const FOLDER_PATH =
  'M3 7.5a2 2 0 0 1 2-2h3.6l1.9 2.2H19a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5z';

/** Coleção. A cor vem da coleção, não do tema. */
export function FolderIcon({ size = 20, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={FOLDER_PATH} stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** Agrupar: a pasta com um "+" dentro. */
export function FolderPlusIcon({ size = 24, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={FOLDER_PATH} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path
        d="M12 11v5M9.5 13.5h5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Mover: a pasta com a seta entrando nela. */
export function FolderMoveIcon({
  size = 24,
  color = colors.railActive,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={FOLDER_PATH} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path
        d="M9.5 13.5h5.5M13 11.5l2 2-2 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Separador do caminho ("Início › Verbos") e afordância de "entra aqui". */
export function ChevronRightIcon({
  size = 13,
  color = '#556670',
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5l7 7-7 7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Fecha o fluxo de prática. */
export function CloseIcon({ size = 22, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Modo por tempo. */
export function TimeIcon({ size = 30, color = '#4bc0f0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={2.4} />
      <Path
        d="M12 9v4l2.5 2M9 3h6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Modo por quantidade. */
export function CountIcon({ size = 30, color = '#c084fc' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.5}
        y={6.5}
        width={12}
        height={14}
        rx={2.6}
        stroke={color}
        strokeWidth={2.1}
      />
      <Path
        d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v11"
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Menos e mais dos ajustes. */
export function MinusIcon({ size = 26, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusStepIcon({ size = 26, color = '#0c2731' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Recomeçar, na tela de resultado. */
export function RestartIcon({ size = 22, color = colors.onPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12a8 8 0 1 1 2.3 5.6"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Path
        d="M4 20v-4h4"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Voltar para a tela inicial. */
export function HomeIcon({ size = 24, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 11.5L12 4l8.5 7.5"
        stroke={color}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 10.2V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.8"
        stroke={color}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Nuvem do header e da tela de Conta.
 *
 * Um desenho com dois estados em vez de dois ícones: `synced` fecha a nuvem e
 * põe a marca de certo dentro dela; sem conta, a nuvem aparece cortada. O
 * corte é o que diz, sem texto, que nada está saindo do aparelho.
 */
export function CloudIcon({
  size = 21,
  color = colors.textSecondary,
  synced = false,
}: IconProps & { synced?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17.5h10.2a3.8 3.8 0 0 0 .4-7.58A5.5 5.5 0 0 0 7.2 8.7 4.4 4.4 0 0 0 7 17.5z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      {synced ? (
        <Path
          d="M9.7 13.2l1.9 1.9 3.9-4"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M4.8 4.3l14.4 14.9"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

/** O G do Google, nas quatro cores da marca deles. */
export function GoogleIcon({ size = 21 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#ea4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285f4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#fbbc05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34a853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** Calendário da linha "na strallo desde". */
export function CalendarIcon({
  size = 20,
  color = colors.textSecondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.5}
        y={5.5}
        width={17}
        height={15}
        rx={3}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M3.5 10.5h17M8 3.5v4M16 3.5v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Porta com seta — o "Sair da conta". */
export function SignOutIcon({ size = 20, color = colors.dangerSoft }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M17.5 8.5L21 12l-3.5 3.5M20.5 12H10"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Alça de arrastar: seis pontos, a convenção universal de "me segure aqui". */
export function GripIcon({ size = 18, color = colors.railIdle }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={9} cy={6} r={1.7} />
      <Circle cx={15} cy={6} r={1.7} />
      <Circle cx={9} cy={12} r={1.7} />
      <Circle cx={15} cy={12} r={1.7} />
      <Circle cx={9} cy={18} r={1.7} />
      <Circle cx={15} cy={18} r={1.7} />
    </Svg>
  );
}

/** Três pontos na vertical — abre o menu da nota. */
export function MoreIcon({ size = 18, color = colors.textSecondary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={5} r={1.8} />
      <Circle cx={12} cy={12} r={1.8} />
      <Circle cx={12} cy={19} r={1.8} />
    </Svg>
  );
}

/** O "U" sublinhado da barra de formatação. */
export function UnderlineIcon({ size = 17, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4v7a5 5 0 0 0 10 0V4"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M5.5 20h13"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Tokens do design system do strallo.
 *
 * Os valores vêm da canvas de design (design/*.dc.html) — cores, raios e
 * medidas são copiados de lá, não arredondados. Mudou o design? Atualize
 * aqui primeiro, e só depois os componentes.
 */

export const colors = {
  /** Fundo do app. */
  bg: '#131f24',
  /** Superfície dos cartões. */
  surface: '#1f2c33',
  /** Campos de entrada e chips. */
  input: '#1c2a31',
  /** Borda padrão dos cartões e campos. */
  border: '#37464f',
  /** Divisor mais escuro (topo da navbar, separadores). */
  borderDim: '#22303a',
  /** Separador interno de menus. */
  borderMenu: '#2b3840',

  text: '#f1f7fb',
  textSecondary: '#7d929c',
  /** Texto de apoio em blocos de leitura (significado). */
  textProse: '#dbe6ec',
  /** Letras ativas do rail alfabético. */
  railActive: '#c7d3d9',
  /** Letras sem cartão no rail alfabético. */
  railIdle: '#46565f',

  /** Amarelo primário da marca. */
  primary: '#ffc800',
  /** Sombra "3D" sob o botão primário. */
  primaryShadow: '#c99a00',
  /** Texto sobre o amarelo. */
  onPrimary: '#2b2317',

  danger: '#ff6b6b',
  /** Borda do botão de excluir. */
  dangerBorder: '#5a2b2b',
} as const;

/** Amarelo com transparência — usado em fundos e bordas tracejadas. */
export const alpha = {
  primaryChip: 'rgba(255,200,0,.14)',
  primaryFill: 'rgba(255,200,0,.08)',
  primaryDash: 'rgba(255,200,0,.5)',
  scrim: 'rgba(5,10,12,.66)',
} as const;

export const radius = {
  card: 18,
  field: 16,
  chip: 14,
  tile: 12,
  check: 8,
} as const;

export const font = {
  /** Corpo. */
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
  /** Display / títulos. */
  display: 'Baloo2_800ExtraBold',
} as const;

export const layout = {
  /** Padding horizontal padrão das telas. */
  gutter: 18,
  /** Altura de um cartão da grade. */
  tileHeight: 104,
  /** Espaço entre cartões da grade (linhas e colunas). */
  tileGap: 13,
  /** Largura da barra alfabética. */
  railWidth: 44,
  /** Altura de toque de cada letra do rail. */
  railItemHeight: 22,
  /** Altura dos botões de ação. */
  buttonHeight: 56,
} as const;

/** Altura total ocupada por uma linha da grade (cartão + espaçamento). */
export const ROW_HEIGHT = layout.tileHeight + layout.tileGap;

/** Sombra "3D" do botão primário — o design usa box-shadow: 0 4px 0. */
export const primaryButtonShadow = {
  borderBottomWidth: 4,
  borderBottomColor: colors.primaryShadow,
} as const;

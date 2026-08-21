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
  /** Vermelho claro do rótulo "Excluir" na barra de seleção. */
  dangerSoft: '#ff8f8f',
  /** Borda do botão de excluir. */
  dangerBorder: '#5a2b2b',

  /** Botão principal enquanto nada foi escolhido. */
  disabled: '#2a3840',
  disabledText: '#556670',

  /** Caixa de seleção vazia, no modo de seleção múltipla. */
  selectBox: '#55666f',
  /** Fundo da caixa vazia — o cartão atrás continua aparecendo. */
  selectBoxFill: 'rgba(19,31,36,.6)',
  /** Barra de ações da seleção: um pouco mais clara que o fundo do app. */
  selectionBar: '#182229',
  /** Superfície do toast, acima da navbar. */
  toast: '#22323a',
} as const;

/**
 * As 10 cores que uma coleção pode ter. São fixas — o design escolheu uma
 * grade 5×2 de quadradinhos, não um seletor livre, para as pastas ficarem
 * distinguíveis entre si sem virar arco-íris.
 */
export const COLLECTION_COLORS = [
  '#ffc800',
  '#ff9f45',
  '#ff6b6b',
  '#ff7eb6',
  '#c084fc',
  '#8b9dff',
  '#4bc0f0',
  '#3fd9c0',
  '#7ad13a',
  '#c3e04a',
] as const;

/** Cor de uma coleção salva com valor fora da lista (banco antigo, importação). */
export const DEFAULT_COLLECTION_COLOR = COLLECTION_COLORS[0];

/**
 * Cores do fluxo de prática. Cada modo tem a sua, e ela reaparece do início ao
 * fim da rodada — azul acompanha o tempo, roxo acompanha a quantidade.
 */
export const game = {
  time: {
    main: '#4bc0f0',
    soft: '#8fd9f2',
    shadow: '#2a94c4',
    on: '#0c2731',
    tint: 'rgba(75,192,240,.14)',
    border: '#1c556b',
    chipBg: '#123543',
  },
  count: {
    main: '#c084fc',
    soft: '#d6b0ff',
    shadow: '#8b5cc7',
    on: '#241733',
    tint: 'rgba(192,132,252,.14)',
    border: '#4b3670',
    chipBg: '#2a1f3d',
  },
  correct: {
    main: '#7ad13a',
    soft: '#9fe063',
    shadow: '#4f8f22',
    on: '#16300a',
    tint: 'rgba(122,209,58,.14)',
    border: '#4a6b1f',
  },
  wrong: {
    main: '#ff6b6b',
    soft: '#ff8f8f',
    shadow: '#b84545',
    on: '#3a1010',
    tint: 'rgba(255,107,107,.12)',
    border: '#5a2b2b',
  },
  /** Trilho vazio da barra de progresso. */
  track: '#243139',
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

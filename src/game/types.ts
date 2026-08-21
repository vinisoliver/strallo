/** Como a rodada termina: quando o relógio zera ou quando os cartões acabam. */
export type GameMode = 'time' | 'count';

/** Ajustes de cada modo, e os limites que o passo a passo respeita. */
export const MODE_SETTINGS = {
  time: {
    /** Segundos. */
    step: 5,
    min: 15,
    max: 300,
    default: 60,
  },
  count: {
    /** Cartões. */
    step: 1,
    min: 5,
    max: 100,
    default: 20,
  },
} as const;

/** Quanto tempo o resultado de uma resposta fica na tela antes do "Continuar". */
export const FEEDBACK_IN_MS = 160;

/** Duração da animação que troca um cartão pelo próximo. */
export const CARD_SWAP_MS = 220;

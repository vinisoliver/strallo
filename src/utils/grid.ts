import { entryKey, entryLabel, type Entry } from '@/db/library';
import { ALPHABET, OTHER_LETTER, letterOf } from '@/utils/text';

/** Primeiro slot da grade é sempre o "+". */
export type GridItem =
  | { type: 'add'; key: string }
  | { type: 'entry'; key: string; entry: Entry; letter?: string };

export type Grid = {
  items: GridItem[];
  /** Letra do rail -> índice do primeiro item dela na grade. */
  letterIndex: Map<string, number>;
  /** Letras que têm ao menos um item. */
  activeLetters: Set<string>;
  /** Letras exibidas no rail, na ordem. */
  letters: string[];
};

/**
 * Monta a grade a partir das entradas já ordenadas.
 *
 * Coleções e cartões entram na mesma grade e na mesma ordem alfabética — uma
 * coleção "Adjetivos" fica entre "Abandon" e "Ability", não numa faixa
 * separada no topo. Para o rail, os dois são a mesma coisa: o que conta é a
 * primeira letra do nome.
 *
 * A letra é marcada em quem **inicia uma sequência** dela: com Abandon,
 * Ability e Absent, apenas Abandon exibe o "A". A comparação é com o item
 * anterior, não com o que já apareceu antes na lista — numa busca os
 * resultados vêm em dois blocos (nome, depois significado), e o segundo bloco
 * recomeça a contagem, marcando a letra de novo.
 */
export function buildGrid(entries: Entry[]): Grid {
  const items: GridItem[] = [{ type: 'add', key: 'add' }];
  const letterIndex = new Map<string, number>();
  const activeLetters = new Set<string>();

  let previousLetter: string | null = null;

  for (const entry of entries) {
    const letter = letterOf(entryLabel(entry));
    const startsSequence = letter !== previousLetter;
    previousLetter = letter;

    activeLetters.add(letter);
    // O rail sempre salta para a primeira ocorrência da letra.
    if (!letterIndex.has(letter)) letterIndex.set(letter, items.length);

    items.push({
      type: 'entry',
      key: entryKey(entry),
      entry,
      letter: startsSequence ? letter : undefined,
    });
  }

  // Nomes que não começam por letra ficam agrupados em "#", que o SQLite já
  // ordenou antes do A.
  const letters = activeLetters.has(OTHER_LETTER)
    ? [OTHER_LETTER, ...ALPHABET]
    : [...ALPHABET];

  return { items, letterIndex, activeLetters, letters };
}

/**
 * Índice para onde rolar quando o dedo para numa letra do rail. Letras sem
 * item levam à próxima letra que tenha — assim o arraste nunca "trava".
 */
export function targetIndexForLetter(grid: Grid, letter: string): number | null {
  const direct = grid.letterIndex.get(letter);
  if (direct !== undefined) return direct;

  const from = grid.letters.indexOf(letter);
  if (from < 0) return null;

  for (let i = from + 1; i < grid.letters.length; i += 1) {
    const next = grid.letterIndex.get(grid.letters[i]);
    if (next !== undefined) return next;
  }
  return null;
}

/**
 * Letra do primeiro item visível a partir de `index` (o mais acima da grade).
 * Avança em vez de retroceder porque o item 0 é o "+", que não tem letra — no
 * topo da lista quem manda é o primeiro item logo ao lado dele.
 *
 * Com a grade vazia, devolve `null`: aí o rail não destaca letra alguma.
 */
export function letterAtIndex(grid: Grid, index: number): string | null {
  for (let i = Math.max(0, index); i < grid.items.length; i += 1) {
    const item = grid.items[i];
    if (item.type === 'entry') return letterOf(entryLabel(item.entry));
  }
  return null;
}

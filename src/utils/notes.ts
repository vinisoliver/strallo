/** Quantas notas cabem num cartão. */
export const MAX_NOTES = 6;

/** Quanto texto cabe numa nota. */
export const MAX_LENGTH = 120;

/**
 * Um trecho sublinhado, em posições de caractere `[início, fim)`.
 *
 * Guardar posições, e não marcação dentro do texto, mantém o texto limpo —
 * ele continua sendo o que a pessoa escreveu, sem `__marcas__` no meio, e
 * segue servindo para busca e para o futuro modo de jogo sem precisar ser
 * desembrulhado antes.
 */
export type Mark = [number, number];

/** O que o app reconheceu sozinho neste pedaço. */
export type Highlight = 'reference' | 'meaning' | null;

/** Um pedaço de texto com formatação uniforme. */
export type Segment = {
  text: string;
  /** Sublinhado à mão pela pessoa. */
  underlined: boolean;
  /** Reconhecido como a referência ou como o significado do cartão. */
  highlight: Highlight;
};

/**
 * Deixa as marcas em ordem, dentro do texto e sem sobreposição.
 *
 * Vale a limpeza porque as marcas vêm de seleções feitas com o dedo, podem
 * chegar invertidas ou encavaladas, e porque o texto pode ter encurtado desde
 * que foram criadas.
 */
export function normalizeMarks(marks: Mark[], length: number): Mark[] {
  const clean = marks
    .map(([a, b]): Mark => [
      Math.max(0, Math.min(length, Math.min(a, b))),
      Math.max(0, Math.min(length, Math.max(a, b))),
    ])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  const merged: Mark[] = [];
  for (const [start, end] of clean) {
    const last = merged[merged.length - 1];
    // Encostadas contam como uma só: duas marcas coladas desenhariam uma
    // linha com um furo de um pixel entre elas.
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  return merged;
}

/**
 * Onde a referência do cartão aparece dentro do texto.
 *
 * A comparação ignora a caixa mas **respeita o acento**, a mesma regra que
 * decide se dois cartões são repetidos: "Café" e "cafe" são coisas
 * diferentes no app, e seria estranho que uma acendesse no lugar da outra.
 *
 * Só conta palavra inteira — sem isso a referência "arte" acenderia dentro de
 * "quarteirão".
 */
export function findReference(text: string, reference: string): Mark[] {
  return findTerm(text, reference);
}

/**
 * As partes do significado que valem como aparição dele.
 *
 * Um significado costuma ser "Coragem — a capacidade de enfrentar o medo", e
 * essa frase inteira jamais aparece dentro de uma nota. O que aparece é
 * "Coragem". Por isso a quebra usa os mesmos separadores que o jogo aceita
 * como resposta certa (ver `game/answer.ts`): o que conta ali como resposta é
 * o que conta aqui como aparição.
 *
 * Pedaços de uma letra ficam de fora — acenderiam em toda parte.
 */
export function meaningTerms(meaning: string): string[] {
  const parts = meaning
    .split(/\s[-—–]\s|[,;/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);

  return [...new Set(parts)];
}

function findTerm(text: string, term: string): Mark[] {
  const needle = term.trim().toLowerCase();
  if (needle.length === 0) return [];

  const haystack = text.toLowerCase();
  // `toLowerCase` pode mudar o comprimento em alguns alfabetos, e aí as
  // posições apontariam para o lugar errado. Melhor não acender nada.
  if (haystack.length !== text.length) return [];

  const found: Mark[] = [];
  let from = 0;

  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;

    const end = at + needle.length;
    if (!isWordChar(haystack[at - 1]) && !isWordChar(haystack[end])) {
      found.push([at, end]);
    }
    from = at + 1;
  }

  return found;
}

function isWordChar(char: string | undefined): boolean {
  if (char === undefined) return false;
  return /[\p{L}\p{N}]/u.test(char);
}

/**
 * Quebra o texto nos pedaços que a tela desenha.
 *
 * São três formatações que se cruzam: o sublinhado feito à mão, a referência
 * do cartão e o significado dele. Dá para sublinhar um trecho que contém a
 * referência, e aí o pedaço do meio tem as duas coisas. Por isso os limites
 * dos três conjuntos entram no mesmo corte, em vez de um ser aplicado depois
 * do outro.
 *
 * Referência e significado são resolvidos aqui, na hora de desenhar, e não
 * guardados junto com a nota. Assim editar o cartão reacende as notas
 * sozinho, sem precisar reescrever nada no banco.
 */
export function buildSegments(
  text: string,
  marks: Mark[],
  reference: string,
  meaning = '',
): Segment[] {
  if (text.length === 0) return [];

  const underlines = normalizeMarks(marks, text.length);
  const references = findReference(text, reference);

  const meanings: Mark[] = [];
  for (const term of meaningTerms(meaning)) {
    meanings.push(...findTerm(text, term));
  }

  const cuts = new Set<number>([0, text.length]);
  for (const [start, end] of [...underlines, ...references, ...meanings]) {
    cuts.add(start);
    cuts.add(end);
  }

  const points = [...cuts].sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    // A referência ganha do significado onde os dois caem no mesmo lugar:
    // um cartão cuja referência repete uma palavra do significado deve
    // acender como referência, que é o que se está aprendendo.
    const highlight: Highlight = covers(references, start)
      ? 'reference'
      : covers(meanings, start)
        ? 'meaning'
        : null;

    segments.push({
      text: text.slice(start, end),
      underlined: covers(underlines, start),
      highlight,
    });
  }

  return segments;
}

function covers(ranges: Mark[], at: number): boolean {
  return ranges.some(([start, end]) => at >= start && at < end);
}

/**
 * Reposiciona as marcas depois de o texto mudar.
 *
 * Usado quando a pessoa edita uma nota já sublinhada: sem isso as posições
 * continuariam apontando para onde as letras estavam antes, e o sublinhado
 * apareceria deslocado. A conta só acerta o caso simples — inserir ou apagar
 * um trecho —, que é o que acontece ao digitar.
 */
export function shiftMarks(
  marks: Mark[],
  at: number,
  removed: number,
  added: number,
): Mark[] {
  const delta = added - removed;
  const removedEnd = at + removed;

  const moved = marks.map(([start, end]): Mark => [
    start >= removedEnd ? start + delta : start > at ? at : start,
    end >= removedEnd ? end + delta : end > at ? at : end,
  ]);

  return normalizeMarks(moved, Number.MAX_SAFE_INTEGER);
}

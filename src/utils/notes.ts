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

/** Um pedaço de texto com formatação uniforme. */
export type Segment = {
  text: string;
  /** Sublinhado à mão pela pessoa. */
  underlined: boolean;
  /** É a referência do cartão aparecendo aqui. */
  reference: boolean;
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
  const needle = reference.trim().toLowerCase();
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
 * As duas formatações são independentes e podem se cruzar: dá para sublinhar
 * um trecho que contém a referência, e então o pedaço do meio é sublinhado
 * **e** amarelo ao mesmo tempo. Por isso os limites dos dois conjuntos entram
 * no mesmo corte, em vez de um ser aplicado depois do outro.
 *
 * A referência é resolvida aqui, na hora de desenhar, e não guardada junto
 * com a nota. Assim renomear o cartão reacende as notas sozinho, sem
 * precisar reescrever nada no banco.
 */
export function buildSegments(
  text: string,
  marks: Mark[],
  reference: string,
): Segment[] {
  if (text.length === 0) return [];

  const underlines = normalizeMarks(marks, text.length);
  const references = findReference(text, reference);

  const cuts = new Set<number>([0, text.length]);
  for (const [start, end] of [...underlines, ...references]) {
    cuts.add(start);
    cuts.add(end);
  }

  const points = [...cuts].sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    segments.push({
      text: text.slice(start, end),
      underlined: covers(underlines, start),
      reference: covers(references, start),
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

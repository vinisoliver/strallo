/** O que cada degrau custa além do próprio nome: dois vãos e a seta. */
export const STEP = 8 * 2 + 13;

export const ELLIPSIS = '…';

export type Plan = {
  /**
   * Posições em `labels` que aparecem depois do Início, em ordem. O índice 0
   * é o Início e nunca entra aqui — ele é fixo.
   */
  tail: number[];
  /**
   * Posição do ancestral escondido mais fundo, ou `null` quando nada foi
   * escondido. É para onde as reticências levam.
   */
  hiddenUpTo: number | null;
};

/**
 * Decide quanto do caminho cabe na largura disponível.
 *
 * A regra é a do design: Início e o nível atual sempre aparecem; o que sobrar
 * de espaço vai sendo preenchido com os ancestrais **de trás para frente**, do
 * mais próximo do atual ao mais distante, e o que não coube vira "…".
 *
 * Preencher de trás para frente é o ponto. Um caminho ancorado à esquerda
 * mostra de onde se partiu, que é a informação menos útil quando a árvore é
 * funda: a pergunta que o caminho responde é "onde eu estou", e a resposta
 * está no fim.
 *
 * Devolve `null` enquanto faltar alguma medida — desenhar torto e corrigir no
 * quadro seguinte apareceria como um salto.
 */
export function planCrumbs(
  labels: string[],
  widths: Record<string, number>,
  boxWidth: number,
): Plan | null {
  const measured =
    boxWidth > 0 &&
    widths[ELLIPSIS] !== undefined &&
    labels.every((label) => widths[label] !== undefined);

  if (!measured) return null;

  const last = labels.length - 1;
  if (last <= 0) return { tail: [], hiddenUpTo: null };

  const total = labels.reduce(
    (sum, label, index) => sum + widths[label] + (index === 0 ? 0 : STEP),
    0,
  );
  if (total <= boxWidth) return { tail: range(1, last), hiddenUpTo: null };

  // O nível atual entra primeiro, e entra mesmo que estoure sozinho: sem ele o
  // caminho deixa de responder à única pergunta que faz. Nesse caso quem corta
  // é o `numberOfLines` do próprio nome.
  const tail = [last];
  let used =
    widths[labels[0]] + STEP + widths[ELLIPSIS] + STEP + widths[labels[last]];

  for (let index = last - 1; index >= 1; index -= 1) {
    const next = used + STEP + widths[labels[index]];
    if (next > boxWidth) break;
    tail.unshift(index);
    used = next;
  }

  // Coube tudo mesmo assim: as reticências não escondem ninguém e saem de
  // cena, devolvendo a largura que reservavam.
  if (tail[0] === 1) return { tail, hiddenUpTo: null };

  return { tail, hiddenUpTo: tail[0] - 1 };
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

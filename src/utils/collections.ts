import type { Collection } from '@/db/collections';

/** O que o cartão de uma coleção mostra embaixo do nome. */
export type CollectionStats = {
  /** Cartões na coleção e em todas as de dentro. */
  cards: number;
  /** Subcoleções, em qualquer profundidade. */
  collections: number;
};

const EMPTY: CollectionStats = { cards: 0, collections: 0 };

export type CollectionTree = {
  /** Todas as coleções, em ordem alfabética. */
  all: Collection[];
  byId: (id: number) => Collection | undefined;
  /** Filhas diretas de um nível, em ordem alfabética. `null` é o Início. */
  childrenOf: (parentId: number | null) => Collection[];
  /** Somas da subárvore — o que o cartão da coleção exibe. */
  statsOf: (id: number) => CollectionStats;
  /** Do Início até a coleção, sem incluir o Início. Vazio na raiz. */
  pathTo: (id: number | null) => Collection[];
  /** `true` se `id` está dentro de `ancestorId`, em qualquer profundidade. */
  isDescendantOf: (id: number, ancestorId: number) => boolean;
};

/**
 * Índice de navegação da árvore de coleções.
 *
 * As contagens são da **subárvore inteira**, não das filhas diretas: uma
 * coleção com duas subcoleções de 40 cartões cada mostra "2 coleções, 80
 * cartões". É a leitura útil — diz o tamanho do que está guardado ali, e é
 * exatamente o conjunto que o botão Praticar vai sortear.
 *
 * `directCardCounts` vem de `countCardsPerCollection`: cartões por coleção,
 * sem herança. A soma acontece aqui, em memória, porque a árvore de pastas é
 * pequena e uma consulta recursiva por cartão exibido custaria muito mais.
 */
export function buildTree(
  collections: Collection[],
  directCardCounts: Map<number | null, number>,
): CollectionTree {
  const byId = new Map<number, Collection>();
  const children = new Map<number | null, Collection[]>();

  for (const collection of collections) {
    byId.set(collection.id, collection);

    const siblings = children.get(collection.parentId);
    if (siblings) siblings.push(collection);
    else children.set(collection.parentId, [collection]);
  }

  // Soma de baixo para cima, com memória: cada coleção é visitada uma vez.
  const stats = new Map<number, CollectionStats>();

  function computeStats(id: number): CollectionStats {
    const cached = stats.get(id);
    if (cached) return cached;

    // Marca antes de descer. Um `parent_id` corrompido apontando para dentro
    // da própria subárvore criaria um ciclo, e a recursão não terminaria.
    stats.set(id, EMPTY);

    let cards = directCardCounts.get(id) ?? 0;
    let count = 0;

    for (const child of children.get(id) ?? []) {
      const inner = computeStats(child.id);
      cards += inner.cards;
      count += inner.collections + 1;
    }

    const total = { cards, collections: count };
    stats.set(id, total);
    return total;
  }

  for (const collection of collections) computeStats(collection.id);

  return {
    all: collections,
    byId: (id) => byId.get(id),
    childrenOf: (parentId) => children.get(parentId) ?? [],
    statsOf: (id) => stats.get(id) ?? EMPTY,

    pathTo: (id) => {
      const path: Collection[] = [];
      let current = id === null ? undefined : byId.get(id);

      while (current) {
        path.unshift(current);
        current =
          current.parentId === null ? undefined : byId.get(current.parentId);
        // Um ciclo levaria a um caminho infinito; a profundidade real da
        // árvore nunca passa do número de coleções.
        if (path.length > byId.size) break;
      }

      return path;
    },

    isDescendantOf: (id, ancestorId) => {
      let current = byId.get(id);
      let steps = 0;

      while (current?.parentId != null && steps <= byId.size) {
        if (current.parentId === ancestorId) return true;
        current = byId.get(current.parentId);
        steps += 1;
      }

      return false;
    },
  };
}

/** "12 coleções, 88 cartões" — some as partes zeradas, e o vazio vira "Vazia". */
export function describeStats({ cards, collections }: CollectionStats): string {
  const parts: string[] = [];

  if (collections > 0) {
    parts.push(`${collections} ${collections === 1 ? 'coleção' : 'coleções'}`);
  }
  if (cards > 0) {
    parts.push(`${cards} ${cards === 1 ? 'cartão' : 'cartões'}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Vazia';
}

/**
 * O aviso da confirmação de exclusão.
 *
 * Excluir uma coleção leva o conteúdo junto, em qualquer profundidade — é a
 * regra combinada, e é a razão de a segunda frase existir: quantos cartões
 * vão embora precisa aparecer **antes** do toque, porque depois não há volta.
 */
export function describeDeletion(
  cardIds: number[],
  collectionIds: number[],
  tree: CollectionTree,
): string {
  const parts: string[] = [];

  if (collectionIds.length > 0) {
    parts.push(
      collectionIds.length === 1
        ? '1 coleção'
        : `${collectionIds.length} coleções`,
    );
  }
  if (cardIds.length > 0) {
    parts.push(cardIds.length === 1 ? '1 cartão' : `${cardIds.length} cartões`);
  }

  // Só coleções, e só uma: aí dá para concordar no feminino.
  const single = parts.length === 1 && cardIds.length + collectionIds.length === 1;
  const onlyCollections = cardIds.length === 0;

  const verb = single
    ? onlyCollections
      ? 'será removida'
      : 'será removido'
    : onlyCollections
      ? 'serão removidas'
      : 'serão removidos';

  const sentence = `${parts.join(' e ')} ${verb} definitivamente.`;

  const inside = collectionIds.reduce(
    (sum, id) => sum + tree.statsOf(id).cards,
    0,
  );

  if (inside === 0) return sentence;

  const where = collectionIds.length === 1 ? 'dentro dela' : 'dentro delas';

  return inside === 1
    ? `${sentence} Isso inclui o cartão guardado ${where}.`
    : `${sentence} Isso inclui os ${inside} cartões guardados ${where}.`;
}

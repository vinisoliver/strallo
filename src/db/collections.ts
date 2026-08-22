import type * as SQLite from 'expo-sqlite';

import { newId } from '@/utils/id';
import { normalize } from '@/utils/text';
import { notifyLocalChange } from '@/cloud/changes';

export type Collection = {
  id: number;
  name: string;
  /** Uma das dez cores do design. */
  color: string;
  /** `null` é o nível de cima — a tela Início. */
  parentId: number | null;
};

type CollectionRow = {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
};

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    parentId: row.parent_id,
  };
}

/**
 * CTE que devolve, em `tree(id)`, a coleção pedida e todas abaixo dela.
 *
 * O parâmetro é o `id` da raiz da busca, ou `null` para a árvore inteira a
 * partir do Início. `IS` no lugar de `=` é o que faz o `null` funcionar: o
 * SQLite trata `NULL IS NULL` como verdadeiro, e é assim que "estar na raiz"
 * entra na recursão como qualquer outro nível.
 *
 * A linha da raiz vem no resultado — o que é exatamente o que se quer para
 * contar cartões ou sortear um baralho "desta coleção, incluindo as de
 * dentro". Para percorrer só o que está **abaixo**, filtre `id IS NOT ?`.
 */
export const SUBTREE_CTE = `
  WITH RECURSIVE tree(id) AS (
    SELECT ?
    UNION ALL
    SELECT c.id FROM collections c, tree t
      WHERE c.parent_id IS t.id AND c.deleted_at IS NULL
  )
`;

/**
 * Todas as coleções, em ordem alfabética.
 *
 * A árvore inteira vem de uma vez porque ela é pequena (pastas, não cartões)
 * e porque quase toda tela precisa dela por completo: a grade quer as
 * contagens da subárvore, o caminho quer os ancestrais, e a tela de mover
 * navega nível a nível. Uma consulta por nível seria uma ida ao banco por
 * toque. Ver `buildTree` em `@/utils/collections`.
 */
export async function listAllCollections(
  db: SQLite.SQLiteDatabase,
): Promise<Collection[]> {
  const rows = await db.getAllAsync<CollectionRow>(
    `SELECT id, name, color, parent_id FROM collections
      WHERE deleted_at IS NULL
      ORDER BY sort_key, id;`,
  );
  return rows.map(toCollection);
}

/** Quantos cartões cada coleção tem **diretamente** (sem contar as de dentro). */
export async function countCardsPerCollection(
  db: SQLite.SQLiteDatabase,
): Promise<Map<number | null, number>> {
  const rows = await db.getAllAsync<{
    collection_id: number | null;
    total: number;
  }>(
    `SELECT collection_id, COUNT(*) AS total FROM cards
      WHERE deleted_at IS NULL
      GROUP BY collection_id;`,
  );

  return new Map(rows.map((row) => [row.collection_id, row.total]));
}

export async function getCollection(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<Collection | null> {
  const row = await db.getFirstAsync<CollectionRow>(
    `SELECT id, name, color, parent_id FROM collections
      WHERE id = ? AND deleted_at IS NULL;`,
    [id],
  );
  return row ? toCollection(row) : null;
}

export async function createCollection(
  db: SQLite.SQLiteDatabase,
  name: string,
  color: string,
  parentId: number | null,
): Promise<number> {
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO collections
       (uuid, name, sort_key, color, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [newId(), name.trim(), normalize(name), color, parentId, now, now],
  );
  notifyLocalChange();
  return result.lastInsertRowId;
}

export async function updateCollection(
  db: SQLite.SQLiteDatabase,
  id: number,
  name: string,
  color: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE collections
     SET name = ?, sort_key = ?, color = ?, updated_at = ?
     WHERE id = ?;`,
    [name.trim(), normalize(name), color, Date.now(), id],
  );

  notifyLocalChange();
}

/**
 * Exclui coleções junto com tudo que está dentro delas — subcoleções e
 * cartões, em qualquer profundidade.
 *
 * É a decisão registrada no PROJECT.md: excluir uma coleção leva o conteúdo
 * junto, e não devolve nada para o nível de cima. Quem chama precisa avisar
 * quantos cartões vão embora — ver `subtreeCardCount`.
 */
export async function deleteCollections(
  db: SQLite.SQLiteDatabase,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;

  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        `${SUBTREE_CTE}
         UPDATE cards SET deleted_at = ?, updated_at = ?
          WHERE collection_id IN (SELECT id FROM tree)
            AND deleted_at IS NULL;`,
        [id, now, now],
      );
      await db.runAsync(
        `${SUBTREE_CTE}
         UPDATE collections SET deleted_at = ?, updated_at = ?
          WHERE id IN (SELECT id FROM tree)
            AND deleted_at IS NULL;`,
        [id, now, now],
      );
    }
  });

  notifyLocalChange();
}

/** Para onde cada item selecionado voltava antes de ser movido — o "Desfazer". */
export type MoveSnapshot = {
  cards: { id: number; parentId: number | null }[];
  collections: { id: number; parentId: number | null }[];
};

/**
 * Lê onde os itens estão agora, antes de movê-los. O toast guarda isto para
 * conseguir devolver cada um ao lugar de origem, mesmo que tenham vindo de
 * coleções diferentes.
 */
export async function snapshotLocations(
  db: SQLite.SQLiteDatabase,
  cardIds: number[],
  collectionIds: number[],
): Promise<MoveSnapshot> {
  const cards = await Promise.all(
    cardIds.map(async (id) => {
      const row = await db.getFirstAsync<{ collection_id: number | null }>(
        'SELECT collection_id FROM cards WHERE id = ?;',
        [id],
      );
      return { id, parentId: row?.collection_id ?? null };
    }),
  );

  const collections = await Promise.all(
    collectionIds.map(async (id) => {
      const row = await db.getFirstAsync<{ parent_id: number | null }>(
        'SELECT parent_id FROM collections WHERE id = ?;',
        [id],
      );
      return { id, parentId: row?.parent_id ?? null };
    }),
  );

  return { cards, collections };
}

/** Move cartões e coleções para dentro de `targetId` (`null` = Início). */
export async function moveEntries(
  db: SQLite.SQLiteDatabase,
  cardIds: number[],
  collectionIds: number[],
  targetId: number | null,
): Promise<void> {
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const id of cardIds) {
      await db.runAsync(
        'UPDATE cards SET collection_id = ?, updated_at = ? WHERE id = ?;',
        [targetId, now, id],
      );
    }
    for (const id of collectionIds) {
      await db.runAsync(
        'UPDATE collections SET parent_id = ?, updated_at = ? WHERE id = ?;',
        [targetId, now, id],
      );
    }
  });

  notifyLocalChange();
}

/** Devolve cada item ao lugar de onde saiu. */
export async function restoreLocations(
  db: SQLite.SQLiteDatabase,
  snapshot: MoveSnapshot,
): Promise<void> {
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const { id, parentId } of snapshot.cards) {
      await db.runAsync(
        'UPDATE cards SET collection_id = ?, updated_at = ? WHERE id = ?;',
        [parentId, now, id],
      );
    }
    for (const { id, parentId } of snapshot.collections) {
      await db.runAsync(
        'UPDATE collections SET parent_id = ?, updated_at = ? WHERE id = ?;',
        [parentId, now, id],
      );
    }
  });

  notifyLocalChange();
}

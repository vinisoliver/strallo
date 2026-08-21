import type * as SQLite from 'expo-sqlite';

import { SUBTREE_CTE, type Collection } from '@/db/collections';
import type { Card } from '@/db/cards';
import { normalize } from '@/utils/text';

/**
 * O que aparece na grade: coleções e cartões dividem a mesma tela, a mesma
 * ordem alfabética e o mesmo rail. Por isso a listagem é uma só, e não duas
 * consultas costuradas na tela.
 */
export type Entry =
  | { kind: 'card'; card: Card }
  | { kind: 'collection'; collection: Collection };

/** Texto pelo qual a entrada é ordenada e agrupada no rail. */
export function entryLabel(entry: Entry): string {
  return entry.kind === 'card' ? entry.card.reference : entry.collection.name;
}

/** Identidade estável na grade — coleção 3 e cartão 3 não são o mesmo item. */
export function entryKey(entry: Entry): string {
  return entry.kind === 'card'
    ? `card-${entry.card.id}`
    : `collection-${entry.collection.id}`;
}

type EntryRow = {
  kind: 'card' | 'collection';
  id: number;
  label: string;
  meaning: string;
  color: string;
  parent_id: number | null;
};

function toEntry(row: EntryRow): Entry {
  if (row.kind === 'card') {
    return {
      kind: 'card',
      card: { id: row.id, reference: row.label, meaning: row.meaning },
    };
  }

  return {
    kind: 'collection',
    collection: {
      id: row.id,
      name: row.label,
      color: row.color,
      parentId: row.parent_id,
    },
  };
}

/**
 * Conteúdo de um nível da árvore, ou o resultado de uma busca dentro dele.
 *
 * **Sem busca**, lista só o nível: quem está diretamente em `parentId`.
 *
 * **Com busca**, procura na subárvore inteira — o nível atual e tudo abaixo.
 * É o que a tela promete ("Buscar nesta coleção") e o que evita um cartão
 * sumir da busca só por ter sido guardado numa pasta. No Início, onde a
 * subárvore é o app todo, o comportamento é o mesmo de sempre.
 *
 * A ordem segue a regra já usada nos cartões: quem casa pelo nome vem
 * primeiro, em ordem alfabética, e depois vêm os cartões encontrados só pelo
 * significado. Coleções entram no primeiro bloco, junto das referências.
 */
export async function listEntries(
  db: SQLite.SQLiteDatabase,
  parentId: number | null,
  query = '',
): Promise<Entry[]> {
  const term = normalize(query);

  if (term.length === 0) {
    const rows = await db.getAllAsync<EntryRow>(
      `SELECT 'collection' AS kind, id, name AS label, '' AS meaning,
              color, parent_id, sort_key
         FROM collections
        WHERE parent_id IS ?
       UNION ALL
       SELECT 'card', id, reference, meaning, '', NULL, sort_key
         FROM cards
        WHERE collection_id IS ?
        ORDER BY sort_key, kind, id;`,
      [parentId, parentId],
    );
    return rows.map(toEntry);
  }

  const like = `%${term}%`;

  // `EXISTS ... IS ...` no lugar de `IN (SELECT id FROM tree)` porque a raiz
  // entra na árvore como NULL, e `NULL IN (NULL, 1)` não é verdadeiro no
  // SQLite — os itens do Início ficariam de fora da busca.
  const rows = await db.getAllAsync<EntryRow>(
    `${SUBTREE_CTE}
     SELECT 'collection' AS kind, id, name AS label, '' AS meaning,
            color, parent_id, sort_key, 0 AS match_rank
       FROM collections
      WHERE EXISTS (SELECT 1 FROM tree WHERE tree.id IS collections.parent_id)
        AND sort_key LIKE ?
     UNION ALL
     SELECT 'card', id, reference, meaning, '', NULL, sort_key,
            CASE WHEN sort_key LIKE ? THEN 0 ELSE 1 END
       FROM cards
      WHERE EXISTS (SELECT 1 FROM tree WHERE tree.id IS cards.collection_id)
        AND (sort_key LIKE ? OR meaning_key LIKE ?)
      ORDER BY match_rank, sort_key, kind, id;`,
    [parentId, like, like, like, like],
  );
  return rows.map(toEntry);
}

import type * as SQLite from 'expo-sqlite';

import { SUBTREE_CTE } from '@/db/collections';
import { newId } from '@/utils/id';
import { foldCase, normalize } from '@/utils/text';
import { notifyLocalChange } from '@/cloud/changes';

export type Card = {
  id: number;
  reference: string;
  meaning: string;
};

type CardRow = {
  id: number;
  reference: string;
  meaning: string;
};

/** O cartão da tela de edição, que também mostra e troca a coleção dele. */
export type CardDetail = Card & { collectionId: number | null };

export async function getCard(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<CardDetail | null> {
  const row = await db.getFirstAsync<CardRow & { collection_id: number | null }>(
    `SELECT id, reference, meaning, collection_id FROM cards
      WHERE id = ? AND deleted_at IS NULL;`,
    [id],
  );

  if (!row) return null;

  return {
    id: row.id,
    reference: row.reference,
    meaning: row.meaning,
    collectionId: row.collection_id,
  };
}

/**
 * Um cartão já salvo com a mesma referência, ou `null` se está livre.
 *
 * A comparação ignora caixa e espaços, mas **não** ignora acento — ver
 * `foldCase`. A busca é no app inteiro, não só na coleção aberta: a mesma
 * referência guardada em duas pastas seriam dois cartões para estudar a
 * mesma coisa, que é o que o Vinícius pediu para impedir.
 *
 * `exceptId` é o próprio cartão sendo editado — sem ele, salvar sem mexer na
 * referência acusaria repetição consigo mesmo.
 */
export async function findDuplicateReference(
  db: SQLite.SQLiteDatabase,
  reference: string,
  exceptId: number | null = null,
): Promise<Card | null> {
  const key = foldCase(reference);
  if (key.length === 0) return null;

  return db.getFirstAsync<CardRow>(
    `SELECT id, reference, meaning FROM cards
      WHERE reference_key = ? AND id IS NOT ? AND deleted_at IS NULL
      LIMIT 1;`,
    [key, exceptId],
  );
}

/** `collectionId` é a coleção aberta quando o "+" foi tocado — `null` no Início. */
export async function createCard(
  db: SQLite.SQLiteDatabase,
  reference: string,
  meaning: string,
  collectionId: number | null = null,
): Promise<number> {
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO cards
       (uuid, reference, meaning, sort_key, meaning_key, reference_key,
        collection_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      newId(),
      reference.trim(),
      meaning.trim(),
      normalize(reference),
      normalize(meaning),
      foldCase(reference),
      collectionId,
      now,
      now,
    ],
  );
  notifyLocalChange();
  return result.lastInsertRowId;
}

/** A coleção vai junto: a tela de edição também troca o cartão de pasta. */
export async function updateCard(
  db: SQLite.SQLiteDatabase,
  id: number,
  reference: string,
  meaning: string,
  collectionId: number | null = null,
): Promise<void> {
  await db.runAsync(
    `UPDATE cards
     SET reference = ?, meaning = ?, sort_key = ?, meaning_key = ?,
         reference_key = ?, collection_id = ?, updated_at = ?
     WHERE id = ?;`,
    [
      reference.trim(),
      meaning.trim(),
      normalize(reference),
      normalize(meaning),
      foldCase(reference),
      collectionId,
      Date.now(),
      id,
    ],
  );

  notifyLocalChange();
}

/**
 * Marca o cartão como excluído em vez de apagar a linha.
 *
 * A linha precisa sobreviver para a exclusão chegar aos outros aparelhos: sem
 * a marca, quem ainda tem o cartão o devolveria no próximo sync, porque para
 * ele a linha simplesmente existe e a do outro sumiu sem deixar recado.
 */
export async function deleteCard(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?;',
    [now, now, id],
  );

  notifyLocalChange();
}

/** Exclui vários de uma vez — o "Excluir" da barra de seleção. */
export async function deleteCards(
  db: SQLite.SQLiteDatabase,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;

  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        'UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?;',
        [now, now, id],
      );
    }
  });

  notifyLocalChange();
}

/** Total de cartões salvos — o número exibido ao lado do logotipo. */
export async function countCards(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM cards WHERE deleted_at IS NULL;',
  );
  return row?.total ?? 0;
}

/**
 * Baralho de uma rodada: cartões com significado preenchido, embaralhados.
 *
 * A ordem vem do SQLite (`RANDOM()`) para não carregar tudo só para sortear.
 * `limit` corta o baralho no modo por quantidade; no modo por tempo ele vem
 * inteiro, porque não dá para saber de antemão quantos cartões cabem.
 *
 * `collectionId` restringe a rodada a uma coleção **e às de dentro dela** —
 * praticar dentro de "Verbos" inclui os cartões de "Irregulares". `null`
 * pratica o app inteiro.
 */
export async function drawCards(
  db: SQLite.SQLiteDatabase,
  limit?: number,
  collectionId: number | null = null,
): Promise<Card[]> {
  return db.getAllAsync<CardRow>(
    `${SUBTREE_CTE}
     SELECT id, reference, meaning FROM cards
      WHERE TRIM(meaning) <> '' AND deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM tree WHERE tree.id IS cards.collection_id)
      ORDER BY RANDOM()
      ${limit === undefined ? '' : 'LIMIT ?'};`,
    limit === undefined ? [collectionId] : [collectionId, limit],
  );
}

/** Quantos cartões podem entrar numa rodada (os que têm significado). */
export async function countPlayableCards(
  db: SQLite.SQLiteDatabase,
  collectionId: number | null = null,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `${SUBTREE_CTE}
     SELECT COUNT(*) AS total FROM cards
      WHERE TRIM(meaning) <> '' AND deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM tree WHERE tree.id IS cards.collection_id);`,
    [collectionId],
  );
  return row?.total ?? 0;
}

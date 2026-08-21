import type * as SQLite from 'expo-sqlite';

import { normalize } from '@/utils/text';

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

/**
 * Todos os cartões em ordem alfabética.
 *
 * `query` procura na referência **e** no significado, ignorando acentos e
 * maiúsculas (a comparação usa `sort_key` e `meaning_key`, as duas colunas
 * normalizadas).
 *
 * A referência tem prioridade: quem casa por ela vem primeiro, em ordem
 * alfabética; depois vêm os encontrados só pelo significado, também em ordem
 * alfabética entre si.
 */
export async function listCards(
  db: SQLite.SQLiteDatabase,
  query = '',
): Promise<Card[]> {
  const term = normalize(query);

  if (term.length === 0) {
    return db.getAllAsync<CardRow>(
      'SELECT id, reference, meaning FROM cards ORDER BY sort_key, id;',
    );
  }

  const like = `%${term}%`;

  return db.getAllAsync<CardRow>(
    `SELECT id, reference, meaning,
            CASE WHEN sort_key LIKE ? THEN 0 ELSE 1 END AS match_rank
     FROM cards
     WHERE sort_key LIKE ? OR meaning_key LIKE ?
     ORDER BY match_rank, sort_key, id;`,
    [like, like, like],
  );
}

export async function getCard(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<Card | null> {
  return db.getFirstAsync<CardRow>(
    'SELECT id, reference, meaning FROM cards WHERE id = ?;',
    [id],
  );
}

export async function createCard(
  db: SQLite.SQLiteDatabase,
  reference: string,
  meaning: string,
): Promise<number> {
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO cards
       (reference, meaning, sort_key, meaning_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      reference.trim(),
      meaning.trim(),
      normalize(reference),
      normalize(meaning),
      now,
      now,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateCard(
  db: SQLite.SQLiteDatabase,
  id: number,
  reference: string,
  meaning: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE cards
     SET reference = ?, meaning = ?, sort_key = ?, meaning_key = ?,
         updated_at = ?
     WHERE id = ?;`,
    [
      reference.trim(),
      meaning.trim(),
      normalize(reference),
      normalize(meaning),
      Date.now(),
      id,
    ],
  );
}

export async function deleteCard(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

/** Total de cartões salvos — o número exibido ao lado do logotipo. */
export async function countCards(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM cards;',
  );
  return row?.total ?? 0;
}

/**
 * Baralho de uma rodada: cartões com significado preenchido, embaralhados.
 *
 * A ordem vem do SQLite (`RANDOM()`) para não carregar tudo só para sortear.
 * `limit` corta o baralho no modo por quantidade; no modo por tempo ele vem
 * inteiro, porque não dá para saber de antemão quantos cartões cabem.
 */
export async function drawCards(
  db: SQLite.SQLiteDatabase,
  limit?: number,
): Promise<Card[]> {
  const rows = await db.getAllAsync<CardRow>(
    `SELECT id, reference, meaning FROM cards
     WHERE TRIM(meaning) <> ''
     ORDER BY RANDOM()
     ${limit === undefined ? '' : 'LIMIT ?'};`,
    limit === undefined ? [] : [limit],
  );
  return rows;
}

/** Quantos cartões podem entrar numa rodada (os que têm significado). */
export async function countPlayableCards(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM cards WHERE TRIM(meaning) <> '';",
  );
  return row?.total ?? 0;
}

import type * as SQLite from 'expo-sqlite';

import { getClient } from '@/cloud/client';

/** Quantas linhas sobem por requisição. */
const BATCH = 200;

/**
 * Marca da última sincronização, por direção.
 *
 * Guardada no próprio SQLite para sobreviver ao fechamento do app: sem ela
 * cada sincronização releria a conta inteira.
 */
async function readCursor(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?;',
    [key],
  );
  return row ? Number(row.value) || 0 : 0;
}

async function writeCursor(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
    [key, String(value)],
  );
}

type RemoteCollection = {
  uuid: string;
  name: string;
  sort_key: string;
  color: string;
  parent_uuid: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type RemoteCard = {
  uuid: string;
  reference: string;
  meaning: string;
  sort_key: string;
  meaning_key: string;
  reference_key: string;
  collection_uuid: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type RemoteSession = {
  uuid: string;
  mode: string;
  answered: number;
  correct: number;
  seconds: number;
  collection_uuid: string | null;
  finished_at: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

/**
 * Sobe o que mudou aqui e desce o que mudou lá.
 *
 * O árbitro de conflito é o `updated_at`: entre duas versões da mesma linha
 * vence a mais recente. Para um acervo pessoal em poucos aparelhos isso
 * basta — o caso que sobra (editar o mesmo cartão nos dois, offline, ao mesmo
 * tempo) perde uma das edições, e resolver isso direito custaria muito mais
 * do que o problema vale aqui.
 *
 * A ordem é sempre coleções antes de cartões, nas duas direções: um cartão
 * aponta para a pasta onde mora, e a pasta precisa existir dos dois lados
 * antes de alguém apontar para ela.
 */
export async function syncNow(
  db: SQLite.SQLiteDatabase,
  userId: string,
): Promise<void> {
  await push(db, userId);
  await pull(db);
}

async function push(db: SQLite.SQLiteDatabase, userId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const since = await readCursor(db, 'push');
  let highest = since;

  // O LEFT JOIN traduz a chave local (INTEGER) para a global (uuid): lá fora
  // o `id` deste aparelho não quer dizer nada.
  const collections = await db.getAllAsync<RemoteCollection>(
    `SELECT c.uuid, c.name, c.sort_key, c.color, p.uuid AS parent_uuid,
            c.created_at, c.updated_at, c.deleted_at
       FROM collections c
       LEFT JOIN collections p ON p.id = c.parent_id
      WHERE c.updated_at > ?
      ORDER BY c.updated_at;`,
    [since],
  );

  const cards = await db.getAllAsync<RemoteCard>(
    `SELECT c.uuid, c.reference, c.meaning, c.sort_key, c.meaning_key,
            c.reference_key, p.uuid AS collection_uuid,
            c.created_at, c.updated_at, c.deleted_at
       FROM cards c
       LEFT JOIN collections p ON p.id = c.collection_id
      WHERE c.updated_at > ?
      ORDER BY c.updated_at;`,
    [since],
  );

  const sessions = await db.getAllAsync<RemoteSession>(
    `SELECT s.uuid, s.mode, s.answered, s.correct, s.seconds,
            p.uuid AS collection_uuid, s.finished_at,
            s.created_at, s.updated_at, s.deleted_at
       FROM practice_sessions s
       LEFT JOIN collections p ON p.id = s.collection_id
      WHERE s.updated_at > ?
      ORDER BY s.updated_at;`,
    [since],
  );

  const work = [
    ['collections', collections],
    ['cards', cards],
    ['practice_sessions', sessions],
  ] as const;

  for (const [table, rows] of work) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows
        .slice(i, i + BATCH)
        .map((row) => ({ ...row, user_id: userId }));

      const { error } = await supabase
        .from(table)
        .upsert(chunk, { onConflict: 'uuid' });
      if (error) throw error;
    }

    for (const row of rows) highest = Math.max(highest, row.updated_at);
  }

  await writeCursor(db, 'push', highest);
}

async function pull(db: SQLite.SQLiteDatabase): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const since = await readCursor(db, 'pull');

  const fetchAll = async <T>(table: string): Promise<T[]> => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as T[];
  };

  const collections = await fetchAll<RemoteCollection>('collections');
  const cards = await fetchAll<RemoteCard>('cards');
  const sessions = await fetchAll<RemoteSession>('practice_sessions');

  await db.withTransactionAsync(async () => {
    // Primeira passada sem o pai: uma subcoleção pode chegar antes da pasta
    // que a contém, e apontar para uma linha que ainda não existe deixaria a
    // árvore quebrada. O vínculo é refeito na passada seguinte, com todas as
    // coleções já no lugar.
    for (const row of collections) {
      await db.runAsync(
        `INSERT INTO collections
           (uuid, name, sort_key, color, parent_id,
            created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET
           name = excluded.name,
           sort_key = excluded.sort_key,
           color = excluded.color,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at
         WHERE excluded.updated_at > collections.updated_at;`,
        [
          row.uuid,
          row.name,
          row.sort_key,
          row.color,
          row.created_at,
          row.updated_at,
          row.deleted_at,
        ],
      );
    }

    for (const row of collections) {
      await db.runAsync(
        `UPDATE collections
            SET parent_id = (SELECT id FROM collections WHERE uuid = ?)
          WHERE uuid = ?;`,
        [row.parent_uuid, row.uuid],
      );
    }

    for (const row of cards) {
      await db.runAsync(
        `INSERT INTO cards
           (uuid, reference, meaning, sort_key, meaning_key, reference_key,
            collection_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?,
                 (SELECT id FROM collections WHERE uuid = ?), ?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET
           reference = excluded.reference,
           meaning = excluded.meaning,
           sort_key = excluded.sort_key,
           meaning_key = excluded.meaning_key,
           reference_key = excluded.reference_key,
           collection_id = excluded.collection_id,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at
         WHERE excluded.updated_at > cards.updated_at;`,
        [
          row.uuid,
          row.reference,
          row.meaning,
          row.sort_key,
          row.meaning_key,
          row.reference_key,
          row.collection_uuid,
          row.created_at,
          row.updated_at,
          row.deleted_at,
        ],
      );
    }

    for (const row of sessions) {
      await db.runAsync(
        `INSERT INTO practice_sessions
           (uuid, mode, answered, correct, seconds, collection_id,
            finished_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?,
                 (SELECT id FROM collections WHERE uuid = ?), ?, ?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET
           deleted_at = excluded.deleted_at,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > practice_sessions.updated_at;`,
        [
          row.uuid,
          row.mode,
          row.answered,
          row.correct,
          row.seconds,
          row.collection_uuid,
          row.finished_at,
          row.created_at,
          row.updated_at,
          row.deleted_at,
        ],
      );
    }
  });

  let highest = since;
  for (const rows of [collections, cards, sessions]) {
    for (const row of rows) highest = Math.max(highest, row.updated_at);
  }

  // A marca acompanha o relógio das linhas que vieram, não o deste aparelho:
  // dois celulares com horas diferentes fariam a marca pular para o futuro e
  // esconder alterações legítimas na leitura seguinte.
  await writeCursor(db, 'pull', highest);

  // O que acabou de descer já está aplicado aqui e não precisa voltar na
  // próxima subida.
  const pushed = await readCursor(db, 'push');
  await writeCursor(db, 'push', Math.max(pushed, highest));
}

import * as SQLite from 'expo-sqlite';

import { normalize } from '@/utils/text';

export const DATABASE_NAME = 'strallo.db';

/** SQL puro, ou um passo que precisa de código (normalizar texto, por exemplo). */
type Migration = string | ((db: SQLite.SQLiteDatabase) => Promise<void>);

/**
 * Migrações aplicadas em ordem. `user_version` guarda quantas já rodaram,
 * então adicionar um item ao fim basta — nunca edite um já publicado.
 */
const MIGRATIONS: Migration[] = [
  `CREATE TABLE cards (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     reference TEXT NOT NULL,
     meaning TEXT NOT NULL DEFAULT '',
     sort_key TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE INDEX cards_sort_key ON cards (sort_key);`,

  // `meaning_key` é o significado sem acento e em minúsculas. Existe porque a
  // busca precisa comparar texto normalizado, e o `lower()` do SQLite não
  // remove acentos — sem isso, "dificil" não encontraria "Difícil".
  async (db) => {
    await db.execAsync(
      "ALTER TABLE cards ADD COLUMN meaning_key TEXT NOT NULL DEFAULT '';",
    );

    const rows = await db.getAllAsync<{ id: number; meaning: string }>(
      'SELECT id, meaning FROM cards;',
    );

    for (const row of rows) {
      await db.runAsync('UPDATE cards SET meaning_key = ? WHERE id = ?;', [
        normalize(row.meaning),
        row.id,
      ]);
    }
  },
];

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const applied = row?.user_version ?? 0;

  for (let version = applied; version < MIGRATIONS.length; version += 1) {
    const migration = MIGRATIONS[version];

    await db.withTransactionAsync(async () => {
      if (typeof migration === 'string') {
        await db.execAsync(migration);
      } else {
        await migration(db);
      }
    });

    // PRAGMA não aceita bind de parâmetros.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }
}

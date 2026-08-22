import type * as SQLite from 'expo-sqlite';

import { newId } from '@/utils/id';
import { foldCase, normalize } from '@/utils/text';

export const DATABASE_NAME = 'strallo.db';

/** SQL puro, ou um passo que precisa de código (normalizar texto, por exemplo). */
type Migration = string | ((db: SQLite.SQLiteDatabase) => Promise<void>);

/**
 * Migrações aplicadas em ordem. `user_version` guarda quantas já rodaram,
 * então adicionar um item ao fim basta — nunca edite um já publicado.
 */
export const MIGRATIONS: Migration[] = [
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

  // Coleções: uma árvore de pastas onde os cartões moram.
  //
  // `parent_id` NULL é o nível de cima (a tela Início), tanto para uma
  // coleção quanto para um cartão — assim "estar na raiz" tem a mesma
  // representação nas duas tabelas, e as consultas comparam com `IS NULL`.
  //
  // Não há `FOREIGN KEY` de propósito: o `PRAGMA foreign_keys` vem desligado
  // no SQLite, então a integridade dependeria de um pragma fácil de esquecer.
  // Quem apaga a subárvore é `deleteCollections`, com a mesma consulta
  // recursiva que o resto do app usa para percorrer a árvore.
  `CREATE TABLE collections (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     sort_key TEXT NOT NULL,
     color TEXT NOT NULL,
     parent_id INTEGER,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE INDEX collections_parent ON collections (parent_id, sort_key);

   ALTER TABLE cards ADD COLUMN collection_id INTEGER;
   CREATE INDEX cards_collection ON cards (collection_id, sort_key);`,

  // `reference_key` é a referência em minúsculas, **com** acento. Serve para
  // recusar cartão repetido, e por isso não pode ser a `sort_key`: aquela
  // tira o acento, e aí "café" e "cafe" seriam o mesmo cartão — o Vinícius
  // quer os dois.
  //
  // O índice não é UNIQUE de propósito: um banco criado antes desta regra
  // pode já ter repetidos, e a migração falharia no meio. Quem recusa é
  // `findDuplicateReference`, antes de salvar.
  async (db) => {
    await db.execAsync(
      "ALTER TABLE cards ADD COLUMN reference_key TEXT NOT NULL DEFAULT '';",
    );

    const rows = await db.getAllAsync<{ id: number; reference: string }>(
      'SELECT id, reference FROM cards;',
    );

    for (const row of rows) {
      await db.runAsync('UPDATE cards SET reference_key = ? WHERE id = ?;', [
        foldCase(row.reference),
        row.id,
      ]);
    }

    await db.execAsync(
      'CREATE INDEX cards_reference_key ON cards (reference_key);',
    );
  },
  // Sincronizacao: cada linha ganha identidade global e marca de exclusao.
  //
  // `uuid` existe porque o autoincrement e unico neste banco, nao entre
  // bancos: dois aparelhos offline criam, os dois, o `id = 7`. O `id` segue
  // mandando dentro do app; o uuid so vale na fronteira com a nuvem, onde as
  // linhas sao casadas por ele. Ver `newId` em `@/utils/id`.
  //
  // `deleted_at` troca a exclusao de verdade por uma marca. Sem isso a
  // exclusao nao se propaga: o aparelho A apaga a linha, o B ainda a tem, e no
  // proximo sync o B **devolve** o que o A tinha excluido. Toda consulta do
  // app passa a filtrar `deleted_at IS NULL`.
  async (db) => {
    for (const table of ['cards', 'collections'] as const) {
      await db.execAsync(
        `ALTER TABLE ${table} ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
         ALTER TABLE ${table} ADD COLUMN deleted_at INTEGER;`,
      );

      // O indice unico so entra depois do preenchimento: com as linhas ainda
      // em '' ele recusaria a segunda.
      const rows = await db.getAllAsync<{ id: number }>(
        `SELECT id FROM ${table};`,
      );
      for (const row of rows) {
        await db.runAsync(`UPDATE ${table} SET uuid = ? WHERE id = ?;`, [
          newId(),
          row.id,
        ]);
      }

      await db.execAsync(`
        CREATE UNIQUE INDEX ${table}_uuid ON ${table} (uuid);
        CREATE INDEX ${table}_dirty ON ${table} (updated_at);
      `);
    }

    // Uma linha por rodada concluida. E o numero "praticas" da tela de Conta,
    // e o motivo de ser tabela e nao contador: um contador nao se sincroniza
    // (somar dois aparelhos daria o dobro), uma lista de rodadas se junta
    // sozinha.
    await db.execAsync(`
      CREATE TABLE practice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL,
        mode TEXT NOT NULL,
        answered INTEGER NOT NULL,
        correct INTEGER NOT NULL,
        seconds INTEGER NOT NULL,
        collection_id INTEGER,
        finished_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
      CREATE UNIQUE INDEX practice_sessions_uuid ON practice_sessions (uuid);
      CREATE INDEX practice_sessions_finished ON practice_sessions (finished_at);

      CREATE TABLE sync_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
  // Notas do cartão: até seis linhas curtas presas a ele.
  //
  // `marks` guarda os trechos sublinhados como pares [inicio, fim) em JSON, e
  // não marcação no meio do texto. Assim `text` continua sendo exatamente o
  // que a pessoa escreveu — serve para busca e para o futuro modo de jogo
  // sem precisar ser desembrulhado antes.
  //
  // A referência do cartão **não** entra aqui: onde ela acende é resolvido na
  // hora de desenhar, então renomear o cartão reacende as notas sozinho.
  `CREATE TABLE notes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     uuid TEXT NOT NULL,
     card_id INTEGER NOT NULL,
     text TEXT NOT NULL,
     marks TEXT NOT NULL DEFAULT '[]',
     position INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted_at INTEGER
   );
   CREATE UNIQUE INDEX notes_uuid ON notes (uuid);
   CREATE INDEX notes_card ON notes (card_id, position);`,
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

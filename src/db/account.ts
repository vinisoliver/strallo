import type * as SQLite from 'expo-sqlite';

/** Os três números que a tela de Conta mostra. */
export type AccountTotals = {
  cards: number;
  collections: number;
  sessions: number;
};

/**
 * Conta o que existe hoje, numa consulta só.
 *
 * São os totais do **aparelho**, que depois de uma sincronização bem-sucedida
 * são também os da conta — a nuvem é cópia do que está aqui, não um segundo
 * acervo. Ler do banco local em vez de perguntar ao servidor mantém a tela
 * respondendo sem internet.
 */
export async function loadTotals(
  db: SQLite.SQLiteDatabase,
): Promise<AccountTotals> {
  const row = await db.getFirstAsync<AccountTotals>(
    `SELECT
       (SELECT COUNT(*) FROM cards WHERE deleted_at IS NULL) AS cards,
       (SELECT COUNT(*) FROM collections WHERE deleted_at IS NULL) AS collections,
       (SELECT COUNT(*) FROM practice_sessions WHERE deleted_at IS NULL) AS sessions;`,
  );

  return row ?? { cards: 0, collections: 0, sessions: 0 };
}

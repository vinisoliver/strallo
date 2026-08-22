import type * as SQLite from 'expo-sqlite';

import type { GameMode } from '@/game/types';
import { newId } from '@/utils/id';
import { notifyLocalChange } from '@/cloud/changes';

export type FinishedRound = {
  mode: GameMode;
  /** Cartões respondidos, certos ou errados. */
  answered: number;
  correct: number;
  /** Duração da rodada, em segundos. */
  seconds: number;
  /** Coleção praticada, ou `null` quando foi o app inteiro. */
  collectionId: number | null;
};

/**
 * Guarda uma rodada concluída.
 *
 * É uma linha por rodada, e não um contador, porque um contador não se
 * sincroniza: dois aparelhos com 20 cada não viram 40 nem 20 — não dá para
 * saber. Uma lista de rodadas, cada uma com sua identidade, se junta sozinha,
 * e ainda deixa a porta aberta para um histórico depois.
 *
 * Só é chamada quando a rodada **termina**; sair no meio não conta.
 */
export async function recordSession(
  db: SQLite.SQLiteDatabase,
  round: FinishedRound,
): Promise<void> {
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO practice_sessions
       (uuid, mode, answered, correct, seconds, collection_id,
        finished_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      newId(),
      round.mode,
      round.answered,
      round.correct,
      round.seconds,
      round.collectionId,
      now,
      now,
      now,
    ],
  );

  notifyLocalChange();
}

/** Quantas rodadas foram concluídas — o número "práticas" da tela de Conta. */
export async function countSessions(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM practice_sessions WHERE deleted_at IS NULL;',
  );
  return row?.total ?? 0;
}

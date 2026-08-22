import type * as SQLite from 'expo-sqlite';

import { notifyLocalChange } from '@/cloud/changes';
import { newId } from '@/utils/id';
import { normalizeMarks, type Mark } from '@/utils/notes';

export type Note = {
  /** `null` enquanto a nota só existe na tela, ainda não salva. */
  id: number | null;
  /** Identidade estável desde que o bloco nasce, mesmo antes de ir ao banco. */
  uuid: string;
  text: string;
  marks: Mark[];
};

type NoteRow = {
  id: number;
  uuid: string;
  text: string;
  marks: string;
};

/** Nota nova, ainda sem linha no banco. */
export function draftNote(text: string, marks: Mark[]): Note {
  return { id: null, uuid: newId(), text, marks };
}

export async function listNotes(
  db: SQLite.SQLiteDatabase,
  cardId: number,
): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT id, uuid, text, marks FROM notes
      WHERE card_id = ? AND deleted_at IS NULL
      ORDER BY position, id;`,
    [cardId],
  );

  return rows.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    text: row.text,
    marks: parseMarks(row.marks, row.text.length),
  }));
}

/**
 * Grava a lista inteira de uma vez.
 *
 * As notas não têm salvamento próprio: elas fazem parte do cartão, e quem
 * confirma é o Salvar da tela de edição. Descartar as alterações precisa
 * descartar as notas junto — se cada bloco se gravasse ao ser criado, sair
 * sem salvar deixaria metade do trabalho no banco.
 *
 * A reconciliação é por `uuid`, e não por posição: assim reordenar não
 * confunde uma nota com outra, e uma nota que foi só arrastada continua
 * sendo a mesma linha.
 */
export async function saveNotes(
  db: SQLite.SQLiteDatabase,
  cardId: number,
  notes: Note[],
): Promise<void> {
  const now = Date.now();
  const keep = notes.map((note) => note.uuid);

  await db.withTransactionAsync(async () => {
    const existing = await db.getAllAsync<{ uuid: string }>(
      'SELECT uuid FROM notes WHERE card_id = ? AND deleted_at IS NULL;',
      [cardId],
    );

    for (const row of existing) {
      if (keep.includes(row.uuid)) continue;
      await db.runAsync(
        'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE uuid = ?;',
        [now, now, row.uuid],
      );
    }

    for (const [position, note] of notes.entries()) {
      const marks = JSON.stringify(normalizeMarks(note.marks, note.text.length));

      await db.runAsync(
        `INSERT INTO notes
           (uuid, card_id, text, marks, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET
           card_id = excluded.card_id,
           text = excluded.text,
           marks = excluded.marks,
           position = excluded.position,
           deleted_at = NULL,
           updated_at = excluded.updated_at;`,
        [note.uuid, cardId, note.text, marks, position, now, now],
      );
    }
  });

  notifyLocalChange();
}

/** Quantas notas cada cartão tem — para a grade e para o futuro modo de jogo. */
export async function countNotesPerCard(
  db: SQLite.SQLiteDatabase,
): Promise<Map<number, number>> {
  const rows = await db.getAllAsync<{ card_id: number; total: number }>(
    `SELECT card_id, COUNT(*) AS total FROM notes
      WHERE deleted_at IS NULL
      GROUP BY card_id;`,
  );
  return new Map(rows.map((row) => [row.card_id, row.total]));
}

/**
 * Lê o JSON das marcas sem confiar nele.
 *
 * O valor pode ter vindo de outro aparelho, de uma versão futura do app ou de
 * um texto que encurtou desde então. Marca corrompida vira nota sem
 * sublinhado, que é bem melhor do que a tela não abrir.
 */
function parseMarks(raw: string, length: number): Mark[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const marks = parsed.filter(
      (item): item is Mark =>
        Array.isArray(item) &&
        item.length === 2 &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number',
    );

    return normalizeMarks(marks, length);
  } catch {
    return [];
  }
}

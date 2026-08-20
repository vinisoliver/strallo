import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { countCards, listCards, type Card } from '@/db/cards';

type UseCards = {
  cards: Card[];
  /** Total salvo no banco — não muda com a busca. */
  total: number;
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Cartões filtrados por `query`, recarregados sempre que a tela volta ao
 * foco — é o que mantém a grade e o contador em dia depois de adicionar,
 * editar ou excluir na outra tela.
 */
export function useCards(query: string): UseCards {
  const db = useSQLiteContext();
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [rows, count] = await Promise.all([
      listCards(db, query),
      countCards(db),
    ]);
    setCards(rows);
    setTotal(count);
    setLoading(false);
  }, [db, query]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      reload().catch(() => {
        if (active) setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [reload]),
  );

  return { cards, total, loading, reload };
}

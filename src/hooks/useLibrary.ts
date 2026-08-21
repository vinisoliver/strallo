import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { countCards } from '@/db/cards';
import { countCardsPerCollection, listAllCollections } from '@/db/collections';
import { listEntries, type Entry } from '@/db/library';
import { buildTree, type CollectionTree } from '@/utils/collections';

/** Um retrato coerente da tela: as entradas, a árvore, e de qual nível são. */
type Snapshot = {
  entries: Entry[];
  tree: CollectionTree;
  total: number;
  /**
   * A coleção a que `entries` pertence — **não** a que foi pedida.
   *
   * A tela desenha o cabeçalho a partir daqui, e não do estado que o toque
   * mudou. Sem isso o caminho ("Início › Verbos") trocaria no mesmo quadro do
   * toque, enquanto a grade só trocaria quando a consulta voltasse: o
   * cabeçalho já dizia "Verbos" com os cartões do Início ainda na tela.
   */
  collectionId: number | null;
};

const EMPTY: Snapshot = {
  entries: [],
  tree: buildTree([], new Map()),
  total: 0,
  collectionId: null,
};

type UseLibrary = Snapshot & {
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Tudo que a tela inicial precisa para desenhar um nível da árvore.
 *
 * A árvore vem inteira junto das entradas porque quase todo elemento da tela
 * depende dela: o cartão de cada coleção mostra a soma da subárvore, o
 * caminho precisa dos ancestrais, e a folha de mover navega por níveis. Uma
 * consulta por informação seria uma ida ao banco por cartão desenhado.
 *
 * Recarrega ao voltar o foco — é o que mantém a grade em dia depois de criar
 * ou editar um cartão na outra tela.
 */
export function useLibrary(
  query: string,
  collectionId: number | null,
): UseLibrary {
  const db = useSQLiteContext();

  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [entries, collections, cardCounts, total] = await Promise.all([
      listEntries(db, collectionId, query),
      listAllCollections(db),
      countCardsPerCollection(db),
      countCards(db),
    ]);

    // Um `setState` só: as quatro partes entram na mesma renderização, então
    // não existe quadro intermediário com metade da tela atualizada.
    setSnapshot({
      entries,
      tree: buildTree(collections, cardCounts),
      total,
      collectionId,
    });
    setLoading(false);
  }, [collectionId, db, query]);

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

  return { ...snapshot, loading, reload };
}

import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { countCardsPerCollection, listAllCollections } from '@/db/collections';
import { buildTree, type CollectionTree } from '@/utils/collections';

const EMPTY = buildTree([], new Map());

type UseCollectionTree = {
  tree: CollectionTree;
  reload: () => Promise<void>;
};

/**
 * Só a árvore de coleções, para telas que precisam escolher uma sem listar
 * cartão nenhum — hoje, a de edição de cartão.
 *
 * Carrega uma vez, ao montar. Diferente de `useLibrary`, não recarrega ao
 * voltar o foco: a tela de edição não perde o foco enquanto está aberta, e
 * uma coleção criada de dentro dela entra pelo `reload` explícito.
 */
export function useCollectionTree(): UseCollectionTree {
  const db = useSQLiteContext();
  const [tree, setTree] = useState<CollectionTree>(EMPTY);

  const reload = useCallback(async () => {
    const [collections, counts] = await Promise.all([
      listAllCollections(db),
      countCardsPerCollection(db),
    ]);
    setTree(buildTree(collections, counts));
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tree, reload };
}

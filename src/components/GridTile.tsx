import { memo } from 'react';

import { CardTile, FolderTile } from '@/components/CardTile';
import type { Entry } from '@/db/library';
import type { CollectionTree } from '@/utils/collections';

type Props = {
  entry: Entry;
  /** Letra do grupo — só o primeiro item de cada letra recebe uma. */
  letter?: string;
  /** De onde sai a contagem da coleção. Estável entre recargas. */
  tree: CollectionTree;
  width: number;
  selecting: boolean;
  selected: boolean;
  onPress: (entry: Entry) => void;
  onLongPress: (entry: Entry) => void;
};

/**
 * Um item da grade, isolado do resto dela.
 *
 * Existe por causa do desempenho da seleção múltipla. Marcar um cartão muda o
 * estado da tela, e sem esta barreira o `FlatList` redesenhava **todos** os
 * itens visíveis a cada toque — cada pasta com o seu SVG — e o toque seguinte
 * só era atendido depois disso, o que aparecia como um atraso entre um clique
 * e outro.
 *
 * O `memo` só funciona porque as funções chegam prontas de fora, criadas uma
 * única vez com `useCallback`, e recebem a entrada como argumento. Se a tela
 * montasse a closure (`onPress={() => toggle(id)}`), a prop seria nova a cada
 * renderização e a comparação nunca economizaria nada.
 */
export const GridTile = memo(function GridTile({
  entry,
  letter,
  tree,
  width,
  selecting,
  selected,
  onPress,
  onLongPress,
}: Props) {
  if (entry.kind === 'collection') {
    const { collection } = entry;

    return (
      <FolderTile
        collection={collection}
        stats={tree.statsOf(collection.id)}
        letter={letter}
        width={width}
        selecting={selecting}
        selected={selected}
        onPress={() => onPress(entry)}
        onLongPress={() => onLongPress(entry)}
      />
    );
  }

  return (
    <CardTile
      card={entry.card}
      letter={letter}
      width={width}
      selecting={selecting}
      selected={selected}
      onPress={() => onPress(entry)}
      onLongPress={() => onLongPress(entry)}
    />
  );
});

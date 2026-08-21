import { useCallback, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { AlphabetRail } from '@/components/AlphabetRail';
import { AddTile, CardTile } from '@/components/CardTile';
import { CardMenuOverlay, type Anchor } from '@/components/CardMenuOverlay';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { Logo, PlayIcon, StackIcon } from '@/components/icons';
import { deleteCard, type Card } from '@/db/cards';
import { useCards } from '@/hooks/useCards';
import { ROW_HEIGHT, alpha, colors, font, layout, radius } from '@/theme';
import {
  buildGrid,
  letterAtIndex,
  targetIndexForLetter,
  type GridItem,
} from '@/utils/grid';

/** A partir desta largura cabe mais de uma coluna extra sem esticar os cartões. */
const WIDE_BREAKPOINT = 600;

/** Respiro entre a grade e o rail alfabético. */
const LIST_PADDING_RIGHT = 6;

type Selection = {
  card: Card;
  letter?: string;
  anchor: Anchor;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const { cards, total, loading, reload } = useCards(query);

  /** Índice do item que está no topo da grade — de onde sai a letra destacada. */
  const [topItemIndex, setTopItemIndex] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);

  const listRef = useRef<FlatList<GridItem>>(null);
  const tileRefs = useRef(new Map<number, View>());

  // Duas colunas no celular, como no design; telas largas ganham uma terceira
  // em vez de esticar os cartões.
  const numColumns = width >= WIDE_BREAKPOINT ? 3 : 2;

  /**
   * Largura fixa de cada cartão — todos iguais, inclusive o "+". Fixar é o
   * que impede um cartão sozinho na última linha de esticar para a linha
   * inteira, como aconteceria com `flex: 1`.
   */
  const tileWidth = useMemo(() => {
    const inner =
      width - layout.railWidth - layout.gutter - LIST_PADDING_RIGHT;
    return Math.floor(
      (inner - layout.tileGap * (numColumns - 1)) / numColumns,
    );
  }, [numColumns, width]);

  const grid = useMemo(() => buildGrid(cards), [cards]);

  // A pílula amarela do rail segue a grade, nunca o dedo — sem cartões,
  // `letterAtIndex` devolve null e nenhuma letra fica destacada.
  const currentLetter = useMemo(
    () => letterAtIndex(grid, topItemIndex),
    [grid, topItemIndex],
  );

  /**
   * Rola até um item da grade.
   *
   * Atenção: com `numColumns > 1` o FlatList conta **linhas**, não itens —
   * `scrollToIndex`, `getItemLayout` e `onScrollToIndexFailed` todos falam em
   * índice de linha. Só esta função converte de item para linha.
   */
  const scrollToItem = useCallback(
    (itemIndex: number) => {
      listRef.current?.scrollToIndex({
        index: Math.floor(itemIndex / numColumns),
        animated: false,
        viewPosition: 0,
      });
    },
    [numColumns],
  );

  const handleSelectLetter = useCallback(
    (letter: string) => {
      // Só rola. Quem pinta a letra destacada é o scroll resultante — se a
      // letra não tem cartão, a grade fica onde está e o destaque também.
      const itemIndex = targetIndexForLetter(grid, letter);
      if (itemIndex !== null) scrollToItem(itemIndex);
    },
    [grid, scrollToItem],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const row = Math.max(0, Math.floor(offsetY / ROW_HEIGHT));
      setTopItemIndex(row * numColumns);
    },
    [numColumns],
  );

  const openMenu = useCallback((card: Card, letter?: string) => {
    const view = tileRefs.current.get(card.id);
    if (!view) return;

    view.measureInWindow((x, y, tileWidth, tileHeight) => {
      setSelection({
        card,
        letter,
        anchor: { x, y, width: tileWidth, height: tileHeight },
      });
    });
  }, []);

  const handleDelete = useCallback(() => {
    if (!selection) return;
    const { id, reference } = selection.card;
    setSelection(null);

    // Excluir não tem volta — sempre confirma antes.
    Alert.alert('Excluir cartão', `"${reference}" será removido definitivamente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(db, id);
          await reload();
        },
      },
    ]);
  }, [db, reload, selection]);

  const handleEdit = useCallback(() => {
    if (!selection) return;
    const { id } = selection.card;
    setSelection(null);
    router.push(`/card/${id}`);
  }, [selection]);

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.type === 'add') {
        return (
          <AddTile
            width={tileWidth}
            onPress={() => router.push('/card/new')}
          />
        );
      }

      return (
        <CardTile
          ref={(node) => {
            if (node) tileRefs.current.set(item.card.id, node);
            else tileRefs.current.delete(item.card.id);
          }}
          card={item.card}
          letter={item.letter}
          width={tileWidth}
          onPress={() => router.push(`/card/${item.card.id}`)}
          onLongPress={() => openMenu(item.card, item.letter)}
        />
      );
    },
    [openMenu, tileWidth],
  );

  const isEmptySearch = !loading && query.length > 0 && cards.length === 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Logo />
          <View style={styles.counter} accessibilityLabel={`${total} cartões`}>
            <StackIcon />
            <Text style={styles.counterText}>{total}</Text>
          </View>
        </View>

        <SearchBar value={query} onChangeText={setQuery} />
      </View>

      <View style={styles.body}>
        <FlatList
          ref={listRef}
          key={`grid-${numColumns}`}
          data={grid.items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          numColumns={numColumns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          getItemLayout={(_, rowIndex) => ({
            length: ROW_HEIGHT,
            offset: ROW_HEIGHT * rowIndex,
            index: rowIndex,
          })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            // `index` aqui também é linha. Só acontece se a linha ainda não
            // foi medida; rola pela média e deixa o getItemLayout ajustar.
            listRef.current?.scrollToOffset({
              offset: averageItemLength * index,
              animated: false,
            });
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            isEmptySearch ? (
              <Text style={styles.empty}>
                Nenhum cartão encontrado para “{query}”.
              </Text>
            ) : null
          }
        />

        <AlphabetRail
          letters={grid.letters}
          activeLetters={grid.activeLetters}
          currentLetter={currentLetter}
          onSelectLetter={handleSelectLetter}
        />
      </View>

      <View
        style={[
          styles.navbar,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <PrimaryButton
          label="PRATICAR"
          icon={<PlayIcon />}
          onPress={() => router.push('/practice')}
        />
      </View>

      <CardMenuOverlay
        card={selection?.card ?? null}
        letter={selection?.letter}
        anchor={selection?.anchor ?? null}
        onClose={() => setSelection(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: alpha.primaryChip,
    borderRadius: radius.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  counterText: {
    fontFamily: font.bodyBlack,
    fontSize: 15,
    color: colors.primary,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  listContent: {
    paddingLeft: layout.gutter,
    paddingRight: 6,
    paddingTop: 6,
    paddingBottom: 16,
  },
  row: {
    gap: layout.tileGap,
    marginBottom: layout.tileGap,
    // Linha incompleta alinha à esquerda em vez de distribuir o espaço.
    justifyContent: 'flex-start',
  },
  empty: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.gutter,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.borderDim,
    backgroundColor: colors.bg,
  },
});

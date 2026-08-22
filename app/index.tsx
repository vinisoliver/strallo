import { useCallback, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  BackHandler,
  FlatList,
  Pressable,
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
import { Breadcrumb } from '@/components/Breadcrumb';
import { AddTile } from '@/components/CardTile';
import { CollectionDialog } from '@/components/CollectionDialog';
import { CollectionPicker } from '@/components/CollectionPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GridTile } from '@/components/GridTile';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { SelectionBar } from '@/components/SelectionBar';
import { Toast } from '@/components/Toast';
import {
  BackIcon,
  CloseIcon,
  CloudIcon,
  Logo,
  PlayIcon,
  StackIcon,
} from '@/components/icons';
import { useCloud } from '@/cloud/CloudProvider';
import { deleteCards } from '@/db/cards';
import {
  createCollection,
  deleteCollections,
  moveEntries,
  restoreLocations,
  snapshotLocations,
  updateCollection,
  type Collection,
  type MoveSnapshot,
} from '@/db/collections';
import type { Entry } from '@/db/library';
import { useLibrary } from '@/hooks/useLibrary';
import { ROW_HEIGHT, alpha, colors, font, game, layout, radius } from '@/theme';
import { describeDeletion } from '@/utils/collections';
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

/** Qual modal está aberto sobre a grade. */
type Dialog =
  | { kind: 'create'; parentId: number | null }
  | { kind: 'edit'; collection: Collection }
  | { kind: 'group' };

type ToastState = {
  message: string;
  highlight?: string;
  highlightColor?: string;
  snapshot: MoveSnapshot;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  /**
   * Coleção **pedida**. Entrar numa coleção troca o conteúdo desta tela em vez
   * de empilhar uma rota nova: é a mesma grade, o mesmo rail e a mesma busca,
   * só que apontando para outro nível.
   */
  const [requestedId, setRequestedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const {
    entries,
    tree,
    total,
    loading,
    reload,
    // Coleção **que está na tela**. O cabeçalho lê daqui, e não de
    // `requestedId`, para o caminho e a grade virarem no mesmo quadro.
    collectionId,
  } = useLibrary(query, requestedId);

  /** Índice do item que está no topo da grade — de onde sai a letra destacada. */
  const [topItemIndex, setTopItemIndex] = useState(0);

  /**
   * Modo de seleção múltipla. É um estado próprio, e não "tem algo marcado",
   * porque desmarcar o último item não deve jogar o usuário para fora do modo
   * — sair é só pelo X.
   */
  const [selecting, setSelecting] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [selectedCollections, setSelectedCollections] = useState<Set<number>>(
    new Set(),
  );

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [moving, setMoving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const listRef = useRef<FlatList<GridItem>>(null);

  const cardIds = useMemo(() => [...selectedCards], [selectedCards]);
  const collectionIds = useMemo(
    () => [...selectedCollections],
    [selectedCollections],
  );
  const selectedCount = cardIds.length + collectionIds.length;

  const path = tree.pathTo(collectionId);

  // Duas colunas no celular, como no design; telas largas ganham uma terceira
  // em vez de esticar os cartões.
  const numColumns = width >= WIDE_BREAKPOINT ? 3 : 2;

  /**
   * Largura fixa de cada cartão — todos iguais, inclusive o "+". Fixar é o
   * que impede um cartão sozinho na última linha de esticar para a linha
   * inteira, como aconteceria com `flex: 1`.
   */
  const tileWidth = useMemo(() => {
    const inner = width - layout.railWidth - layout.gutter - LIST_PADDING_RIGHT;
    return Math.floor((inner - layout.tileGap * (numColumns - 1)) / numColumns);
  }, [numColumns, width]);

  const grid = useMemo(() => buildGrid(entries), [entries]);

  // A pílula amarela do rail segue a grade, nunca o dedo — sem itens,
  // `letterAtIndex` devolve null e nenhuma letra fica destacada.
  const currentLetter = useMemo(
    () => letterAtIndex(grid, topItemIndex),
    [grid, topItemIndex],
  );

  const clearSelection = useCallback(() => {
    setSelecting(false);
    setSelectedCards(new Set());
    setSelectedCollections(new Set());
  }, []);

  /** Troca de nível: a busca e a seleção são daquele nível, não seguem junto. */
  const openCollection = useCallback(
    (id: number | null) => {
      setRequestedId(id);
      setQuery('');
      clearSelection();
      setTopItemIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [clearSelection],
  );

  const goUp = useCallback(() => {
    const parent = requestedId === null ? null : tree.byId(requestedId);
    openCollection(parent?.parentId ?? null);
  }, [openCollection, requestedId, tree]);

  /**
   * O voltar do Android segue a mesma ordem do que está na frente dos olhos:
   * sai da seleção, depois sobe um nível, e só então deixa o sistema fechar o
   * app. Sem isto, estar três coleções fundo e apertar voltar fecharia tudo.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (selecting) {
            clearSelection();
            return true;
          }
          if (requestedId !== null) {
            goUp();
            return true;
          }
          return false;
        },
      );

      return () => subscription.remove();
    }, [clearSelection, goUp, requestedId, selecting]),
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
      // letra não tem item, a grade fica onde está e o destaque também.
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

  const toggleCard = useCallback((id: number) => {
    setSelectedCards((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const toggleCollection = useCallback((id: number) => {
    setSelectedCollections((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  /**
   * Toque num item. Vive aqui, e não numa closure dentro do `renderItem`,
   * para chegar ao `GridTile` como a mesma função em toda renderização — é o
   * que deixa o `memo` dele barrar o redesenho da grade a cada seleção.
   */
  const handleEntryPress = useCallback(
    (entry: Entry) => {
      if (entry.kind === 'card') {
        if (selecting) toggleCard(entry.card.id);
        else router.push(`/card/${entry.card.id}`);
        return;
      }

      if (selecting) toggleCollection(entry.collection.id);
      else openCollection(entry.collection.id);
    },
    [openCollection, selecting, toggleCard, toggleCollection],
  );

  /** Segurar liga o modo e já marca o item que estava sob o dedo. */
  const handleEntryLongPress = useCallback(
    (entry: Entry) => {
      setSelecting(true);
      if (entry.kind === 'card') toggleCard(entry.card.id);
      else toggleCollection(entry.collection.id);
    },
    [toggleCard, toggleCollection],
  );

  const selectAll = useCallback(() => {
    const cards = new Set<number>();
    const collections = new Set<number>();

    for (const entry of entries) {
      if (entry.kind === 'card') cards.add(entry.card.id);
      else collections.add(entry.collection.id);
    }

    setSelectedCards(cards);
    setSelectedCollections(collections);
  }, [entries]);

  /** Move a seleção e guarda de onde ela saiu, para o "Desfazer" do toast. */
  const applyMove = useCallback(
    async (targetId: number | null, message: string) => {
      // Guarda contra arrancar o galho junto do ramo: uma coleção não pode
      // acabar dentro de si mesma. A folha já esconde esses destinos; aqui é
      // a rede de segurança de quem chama.
      const invalid = collectionIds.some(
        (id) => id === targetId || (targetId !== null && tree.isDescendantOf(targetId, id)),
      );
      if (invalid) return;

      const snapshot = await snapshotLocations(db, cardIds, collectionIds);
      await moveEntries(db, cardIds, collectionIds, targetId);

      const target = targetId === null ? null : tree.byId(targetId);

      clearSelection();
      setMoving(false);
      await reload();

      setToast({
        message,
        highlight: target?.name ?? 'Início',
        highlightColor: target?.color ?? colors.primary,
        snapshot,
      });
    },
    [cardIds, clearSelection, collectionIds, db, reload, tree],
  );

  const handleMove = useCallback(
    (targetId: number | null) => {
      const count = selectedCount;
      void applyMove(
        targetId,
        count === 1 ? '1 item movido para' : `${count} itens movidos para`,
      );
    },
    [applyMove, selectedCount],
  );

  const handleUndo = useCallback(async () => {
    if (!toast) return;
    await restoreLocations(db, toast.snapshot);
    setToast(null);
    await reload();
  }, [db, reload, toast]);

  /** Agrupar: cria a coleção no nível aberto e joga a seleção para dentro. */
  const handleGroup = useCallback(
    async (name: string, color: string) => {
      const newId = await createCollection(db, name, color, collectionId);
      await moveEntries(db, cardIds, collectionIds, newId);

      setDialog(null);
      clearSelection();
      await reload();
    },
    [cardIds, clearSelection, collectionId, collectionIds, db, reload],
  );

  const handleCreate = useCallback(
    async (parentId: number | null, name: string, color: string) => {
      await createCollection(db, name, color, parentId);
      setDialog(null);
      await reload();
    },
    [db, reload],
  );

  const handleRename = useCallback(
    async (id: number, name: string, color: string) => {
      await updateCollection(db, id, name, color);
      setDialog(null);
      clearSelection();
      await reload();
    },
    [clearSelection, db, reload],
  );

  /** Editar só existe com um item marcado — cartão abre a tela, coleção o modal. */
  const handleEdit = useCallback(() => {
    if (selectedCount !== 1) return;

    if (cardIds.length === 1) {
      const id = cardIds[0];
      clearSelection();
      router.push(`/card/${id}`);
      return;
    }

    const collection = tree.byId(collectionIds[0]);
    if (collection) setDialog({ kind: 'edit', collection });
  }, [cardIds, clearSelection, collectionIds, selectedCount, tree]);

  const handleDelete = useCallback(async () => {
    setConfirmingDelete(false);

    await deleteCards(db, cardIds);
    await deleteCollections(db, collectionIds);

    clearSelection();
    await reload();
  }, [cardIds, clearSelection, collectionIds, db, reload]);

  const handleAdd = useCallback(() => {
    router.push(
      collectionId === null
        ? '/card/new'
        : `/card/new?collection=${collectionId}`,
    );
  }, [collectionId]);

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.type === 'add') {
        return <AddTile width={tileWidth} onPress={handleAdd} />;
      }

      const { entry } = item;
      const selected =
        entry.kind === 'card'
          ? selectedCards.has(entry.card.id)
          : selectedCollections.has(entry.collection.id);

      return (
        <GridTile
          entry={entry}
          letter={item.letter}
          tree={tree}
          width={tileWidth}
          selecting={selecting}
          selected={selected}
          onPress={handleEntryPress}
          onLongPress={handleEntryLongPress}
        />
      );
    },
    [
      handleAdd,
      handleEntryLongPress,
      handleEntryPress,
      selectedCards,
      selectedCollections,
      selecting,
      tileWidth,
      tree,
    ],
  );

  /**
   * O `FlatList` só reconsidera as células quando alguma prop muda. As
   * marcações vivem em `Set`s mutados por cópia, então este objeto é o sinal
   * de "a seleção mudou" — sem ele, marcar um cartão não repintaria nada.
   */
  const extraData = useMemo(
    () => ({ selectedCards, selectedCollections, selecting }),
    [selectedCards, selectedCollections, selecting],
  );

  const isEmptySearch = !loading && query.length > 0 && entries.length === 0;
  const navbarPadding = Math.max(insets.bottom, 16) + 10;

  return (
    <View style={styles.screen}>
      {selecting ? (
        <View style={[styles.selectHeader, { paddingTop: insets.top + 10 }]}>
          <View style={styles.selectHeaderLeft}>
            <Pressable
              onPress={clearSelection}
              accessibilityRole="button"
              accessibilityLabel="Sair da seleção"
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <CloseIcon />
            </Pressable>

            <Text style={styles.selectTitle}>
              {selectedCount === 1
                ? '1 selecionado'
                : `${selectedCount} selecionados`}
            </Text>
          </View>

          <Pressable
            onPress={selectAll}
            accessibilityRole="button"
            accessibilityLabel="Selecionar todos"
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.selectAll}>Todos</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          {collectionId === null ? (
            <View style={styles.headerRow}>
              <Logo />
              <View style={styles.headerRight}>
                <View
                  style={styles.counter}
                  accessibilityLabel={`${total} cartões`}
                >
                  <StackIcon />
                  <Text style={styles.counterText}>{total}</Text>
                </View>
                <CloudButton />
              </View>
            </View>
          ) : (
            // Dentro de uma coleção o logotipo dá lugar ao caminho: o que
            // importa saber ali é onde se está, não em qual app.
            <View style={styles.pathRow}>
              <Pressable
                onPress={goUp}
                accessibilityRole="button"
                accessibilityLabel="Voltar um nível"
                style={({ pressed }) => [
                  styles.smallButton,
                  pressed && styles.pressed,
                ]}
              >
                <BackIcon size={20} />
              </Pressable>

              <View style={styles.pathScroll}>
                <Breadcrumb
                  path={path}
                  onNavigate={(index) =>
                    openCollection(index < 0 ? null : path[index].id)
                  }
                />
              </View>
            </View>
          )}

          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={
              collectionId === null ? 'Buscar cartão' : 'Buscar nesta coleção'
            }
          />
        </View>
      )}

      <View style={styles.body}>
        <FlatList
          ref={listRef}
          key={`grid-${numColumns}`}
          data={grid.items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          numColumns={numColumns}
          extraData={extraData}
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
                Nenhum resultado para “{query}”.
              </Text>
            ) : null
          }
        />

        {/* O rail continua ativo durante a seleção: dá para pular letras sem
            perder o que já foi marcado. */}
        <AlphabetRail
          letters={grid.letters}
          activeLetters={grid.activeLetters}
          currentLetter={currentLetter}
          onSelectLetter={handleSelectLetter}
        />
      </View>

      <Toast
        visible={toast !== null}
        message={toast?.message ?? ''}
        highlight={toast?.highlight}
        highlightColor={toast?.highlightColor}
        bottom={navbarPadding + layout.buttonHeight + 24}
        onUndo={handleUndo}
        onHide={() => setToast(null)}
      />

      {selecting ? (
        <SelectionBar
          count={selectedCount}
          paddingBottom={navbarPadding}
          onGroup={() => setDialog({ kind: 'group' })}
          onMove={() => setMoving(true)}
          onEdit={handleEdit}
          onDelete={() => setConfirmingDelete(true)}
        />
      ) : (
        <View style={[styles.navbar, { paddingBottom: navbarPadding }]}>
          <PrimaryButton
            label="PRATICAR"
            icon={<PlayIcon />}
            onPress={() =>
              router.push(
                collectionId === null
                  ? '/practice'
                  : `/practice?collection=${collectionId}`,
              )
            }
          />
        </View>
      )}

      <CollectionPicker
        visible={moving}
        title="Mover para"
        subtitle={
          selectedCount === 1
            ? '1 item selecionado'
            : `${selectedCount} itens selecionados`
        }
        confirmLabel="MOVER"
        tree={tree}
        startAt={collectionId}
        excludeIds={collectionIds}
        onConfirm={handleMove}
        onCreateCollection={(parentId) => setDialog({ kind: 'create', parentId })}
        onCancel={() => setMoving(false)}
      />

      {/* Depois da folha no JSX de propósito: criar uma coleção a partir dela
          abre este modal por cima, e fechar volta para a lista. */}
      <CollectionDialog
        visible={dialog !== null}
        title={
          dialog?.kind === 'edit'
            ? 'Editar coleção'
            : dialog?.kind === 'group'
              ? 'Agrupar em nova coleção'
              : 'Nova coleção'
        }
        subtitle={
          dialog?.kind === 'group'
            ? `${selectedCount} itens vão para dentro dela`
            : undefined
        }
        confirmLabel={
          dialog?.kind === 'edit'
            ? 'SALVAR'
            : dialog?.kind === 'group'
              ? 'AGRUPAR'
              : 'CRIAR COLEÇÃO'
        }
        initialName={dialog?.kind === 'edit' ? dialog.collection.name : ''}
        initialColor={
          dialog?.kind === 'edit' ? dialog.collection.color : undefined
        }
        onConfirm={(name, color) => {
          if (!dialog) return;

          if (dialog.kind === 'edit') {
            void handleRename(dialog.collection.id, name, color);
          } else if (dialog.kind === 'group') {
            void handleGroup(name, color);
          } else {
            void handleCreate(dialog.parentId, name, color);
          }
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        visible={confirmingDelete}
        title={selectedCount === 1 ? 'Excluir item' : 'Excluir itens'}
        message={describeDeletion(cardIds, collectionIds, tree)}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

/**
 * Nuvem do header: diz, de relance, se existe uma cópia do acervo em algum
 * lugar além deste celular.
 *
 * Sem conta a nuvem aparece cortada e ganha um ponto de aviso — é a única
 * coisa no início que pede atenção sem ser pedida. Com conta ela fecha e fica
 * verde, e o ponto some: não há nada a resolver.
 */
function CloudButton() {
  const { status } = useCloud();
  const synced = status === 'signedIn';

  return (
    <Pressable
      onPress={() => router.push('/account')}
      accessibilityRole="button"
      accessibilityLabel={synced ? 'Conta sincronizada' : 'Entrar na conta'}
      style={({ pressed }) => [
        styles.cloudButton,
        synced ? styles.cloudOn : styles.cloudOff,
        pressed && styles.pressed,
      ]}
    >
      <CloudIcon
        size={21}
        synced={synced}
        color={synced ? game.correct.main : colors.textSecondary}
      />
      {status === 'signedOut' ? <View style={styles.cloudDot} /> : null}
    </Pressable>
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
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  pathScroll: {
    flex: 1,
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
  },
  selectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTitle: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  selectAll: {
    fontFamily: font.bodyBlack,
    fontSize: 14,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cloudButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudOff: {
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.borderMenu,
  },
  cloudOn: {
    backgroundColor: game.correct.tint,
  },
  // Ponto de aviso: existe algo aqui que ainda não foi resolvido.
  cloudDot: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0aa0fc',
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
    paddingRight: LIST_PADDING_RIGHT,
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

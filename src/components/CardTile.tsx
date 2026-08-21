import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SelectionBox } from '@/components/SelectionBox';
import { FolderIcon, PlusIcon } from '@/components/icons';
import type { Card } from '@/db/cards';
import type { Collection } from '@/db/collections';
import { alpha, colors, font, layout, radius } from '@/theme';
import { describeStats, type CollectionStats } from '@/utils/collections';

/** Quanto tempo o dedo fica sobre um item até ligar o modo de seleção. */
export const LONG_PRESS_MS = 300;

/** O que todo item da grade recebe — cartão e coleção se comportam igual. */
type TileProps = {
  /** Letra do grupo — só o primeiro item de cada letra recebe uma. */
  letter?: string;
  /**
   * Largura fixa da coluna. Sem ela o último item de uma linha ímpar
   * esticaria para a linha inteira.
   */
  width: number;
  /** No modo de seleção todos mostram a caixa, marcada ou não. */
  selecting?: boolean;
  selected?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/**
 * Cartão da grade. Mostra apenas a referência; o significado só aparece na
 * tela de edição.
 */
export function CardTile({
  card,
  letter,
  width,
  selecting,
  selected,
  onPress,
  onLongPress,
}: TileProps & { card: Card }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityLabel={card.reference}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      accessibilityHint={
        selecting
          ? 'Toque para marcar ou desmarcar.'
          : 'Toque para editar. Segure para selecionar.'
      }
      style={({ pressed }) => [
        styles.tile,
        { width },
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      {letter ? <Text style={styles.letter}>{letter}</Text> : null}
      {selecting ? <SelectionBox checked={!!selected} /> : null}
      <Text style={styles.reference} numberOfLines={2}>
        {card.reference}
      </Text>
    </Pressable>
  );
}

/**
 * Coleção na grade. É o mesmo cartão dos demais — mesma superfície, mesma
 * borda — e a cor escolhida aparece só em dois lugares: o ícone do canto e a
 * borda de baixo. Tingir o fundo faria a pasta virar outro componente; do
 * jeito do design ela continua sendo um cartão, só que com uma marca.
 *
 * No modo de seleção a caixa toma o canto direito, então o ícone desce para
 * junto do nome — é o que a artboard `SelectMode` mostra.
 */
export function FolderTile({
  collection,
  stats,
  letter,
  width,
  selecting,
  selected,
  onPress,
  onLongPress,
}: TileProps & { collection: Collection; stats: CollectionStats }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityLabel={`Coleção ${collection.name}, ${describeStats(stats)}`}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      accessibilityHint={
        selecting
          ? 'Toque para marcar ou desmarcar.'
          : 'Toque para abrir. Segure para selecionar.'
      }
      style={({ pressed }) => [
        styles.folder,
        { width, borderBottomColor: collection.color },
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      {letter ? <Text style={styles.letter}>{letter}</Text> : null}

      {selecting ? (
        <>
          <SelectionBox checked={!!selected} />
          <View style={styles.folderRow}>
            <FolderIcon color={collection.color} />
            <Text style={styles.folderName} numberOfLines={1}>
              {collection.name}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.folderMark}>
            <FolderIcon color={collection.color} />
          </View>
          <Text style={styles.folderName} numberOfLines={2}>
            {collection.name}
          </Text>
          <Text style={styles.folderCount} numberOfLines={1}>
            {describeStats(stats)}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Primeiro slot da grade: cria um cartão já dentro da coleção aberta. */
export function AddTile({
  width,
  onPress,
}: {
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Adicionar cartão"
      style={({ pressed }) => [
        styles.addTile,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <PlusIcon />
      <Text style={styles.addLabel}>Adicionar</Text>
    </Pressable>
  );
}

const base = {
  height: layout.tileHeight,
  borderRadius: radius.card,
  backgroundColor: colors.surface,
  borderWidth: 2,
  borderColor: colors.border,
  borderBottomWidth: 4,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 10,
} as const;

const styles = StyleSheet.create({
  tile: base,
  folder: {
    ...base,
    gap: 4,
  },
  // A borda amarela some no cartão marcado — a de baixo é a cor da coleção,
  // então `borderColor` sozinho a sobrescreveria.
  tileSelected: {
    borderColor: colors.primary,
    borderBottomColor: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  letter: {
    position: 'absolute',
    top: 9,
    left: 11,
    fontFamily: font.bodyBlack,
    fontSize: 11,
    color: colors.primary,
  },
  reference: {
    fontFamily: font.bodyBlack,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },
  folderMark: {
    position: 'absolute',
    top: 9,
    right: 11,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '100%',
  },
  folderName: {
    fontFamily: font.bodyBlack,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
  folderCount: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  addTile: {
    height: layout.tileHeight,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: alpha.primaryDash,
    borderRadius: radius.card,
    backgroundColor: alpha.primaryFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.primary,
  },
});

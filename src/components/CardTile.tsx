import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons';
import type { Card } from '@/db/cards';
import { alpha, colors, font, layout, radius } from '@/theme';

/** Quanto tempo o dedo fica sobre um cartão até abrir o menu de seleção. */
export const LONG_PRESS_MS = 300;

type CardTileProps = {
  card: Card;
  /** Letra do grupo — só o primeiro cartão de cada letra recebe uma. */
  letter?: string;
  /**
   * Largura fixa da coluna. Sem ela o último cartão de uma linha ímpar
   * esticaria para a linha inteira.
   */
  width: number;
  onPress: () => void;
  onLongPress: () => void;
};

/**
 * Cartão da grade. Mostra apenas a referência; o significado só aparece na
 * tela de edição.
 */
export const CardTile = forwardRef<View, CardTileProps>(function CardTile(
  { card, letter, width, onPress, onLongPress },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityLabel={card.reference}
      accessibilityHint="Toque para editar. Segure para abrir opções."
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      {letter ? <Text style={styles.letter}>{letter}</Text> : null}
      <Text style={styles.reference} numberOfLines={2}>
        {card.reference}
      </Text>
    </Pressable>
  );
});

/** Primeiro slot da grade: abre a tela de novo cartão. */
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

export const tileStyles = StyleSheet.create({
  /** Compartilhado com o overlay de seleção, que redesenha o cartão. */
  base: {
    height: layout.tileHeight,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});

const styles = StyleSheet.create({
  tile: {
    ...tileStyles.base,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
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

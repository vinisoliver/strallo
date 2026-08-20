import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CheckIcon, PencilIcon, TrashIcon } from '@/components/icons';
import type { Card } from '@/db/cards';
import { alpha, colors, font, radius } from '@/theme';

/** Retângulo do cartão na tela, medido no momento em que o menu abriu. */
export type Anchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  card: Card | null;
  letter?: string;
  anchor: Anchor | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const MENU_HEIGHT = 106;
const MENU_GAP = 12;

/**
 * Menu de seleção de um cartão, aberto ao segurar o cartão por 2 segundos.
 * O resto da tela escurece e o cartão escolhido é redesenhado sobre o mesmo
 * ponto em que estava, marcado com a caixa de seleção.
 */
export function CardMenuOverlay({
  card,
  letter,
  anchor,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const visible = card !== null && anchor !== null;

  if (!visible || !anchor || !card) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }

  // O menu abre abaixo do cartão; se não couber, sobe para cima dele.
  const below = anchor.y + anchor.height + MENU_GAP;
  const fitsBelow = below + MENU_HEIGHT < screenHeight - 24;
  const menuTop = fitsBelow ? below : anchor.y - MENU_GAP - MENU_HEIGHT;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityLabel="Fechar menu"
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.card,
          {
            top: anchor.y,
            left: anchor.x,
            width: anchor.width,
            height: anchor.height,
          },
        ]}
      >
        {letter ? <Text style={styles.letter}>{letter}</Text> : null}
        <View style={styles.checkbox}>
          <CheckIcon />
        </View>
        <Text style={styles.reference} numberOfLines={2}>
          {card.reference}
        </Text>
      </View>

      <View
        style={[
          styles.menu,
          { top: menuTop, left: anchor.x, width: Math.max(anchor.width, 168) },
        ]}
      >
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.item,
            styles.itemDivided,
            pressed && styles.itemPressed,
          ]}
        >
          <PencilIcon />
          <Text style={styles.itemLabel}>Editar</Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <TrashIcon />
          <Text style={[styles.itemLabel, styles.itemDanger]}>Excluir</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.scrim,
  },
  card: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  letter: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontFamily: font.bodyBlack,
    fontSize: 11,
    color: colors.primary,
  },
  checkbox: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 24,
    height: 24,
    borderRadius: radius.check,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reference: {
    fontFamily: font.bodyBlack,
    fontSize: 21,
    color: colors.text,
    textAlign: 'center',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  itemDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMenu,
  },
  itemPressed: {
    backgroundColor: colors.input,
  },
  itemLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.text,
  },
  itemDanger: {
    color: colors.danger,
  },
});

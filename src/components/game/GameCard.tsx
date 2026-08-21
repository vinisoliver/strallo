import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Card } from '@/db/cards';
import { CARD_SWAP_MS } from '@/game/types';
import { colors, font, game, radius } from '@/theme';
import { letterOf } from '@/utils/text';

export type CardStatus = 'idle' | 'correct' | 'wrong';

type Props = {
  card: Card;
  status: CardStatus;
};

/**
 * O cartão da rodada. Quando a referência muda, o cartão atual sai deslizando
 * para a esquerda e o próximo entra pela direita — a troca fica visível, em
 * vez de o texto simplesmente trocar no lugar.
 */
export function GameCard({ card, status }: Props) {
  const { width } = useWindowDimensions();
  const [shown, setShown] = useState(card);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (card.id === shown.id) return;

    const distance = width * 0.55;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -distance,
        duration: CARD_SWAP_MS * 0.45,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: CARD_SWAP_MS * 0.45,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;

      // Só troca o conteúdo com o cartão fora de vista, e o traz de volta
      // entrando pelo outro lado.
      setShown(card);
      translateX.setValue(distance);

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: CARD_SWAP_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: CARD_SWAP_MS * 0.7,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [card, opacity, shown.id, translateX, width]);

  const border =
    status === 'correct'
      ? game.correct.main
      : status === 'wrong'
        ? game.wrong.main
        : colors.border;

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: border, opacity, transform: [{ translateX }] },
      ]}
    >
      <Text style={styles.letter}>{letterOf(shown.reference)}</Text>
      <View style={styles.center}>
        <Text style={styles.reference} numberOfLines={3} adjustsFontSizeToFit>
          {shown.reference}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 230,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  center: {
    paddingHorizontal: 20,
  },
  letter: {
    position: 'absolute',
    top: 16,
    left: 18,
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.primary,
  },
  reference: {
    fontFamily: font.display,
    fontSize: 46,
    lineHeight: 56,
    color: colors.text,
    textAlign: 'center',
  },
});

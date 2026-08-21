import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { colors, font, game, radius } from '@/theme';

type Props = {
  visible: boolean;
  /** Texto antes do destaque: "3 itens movidos para". */
  message: string;
  /** O nome do destino, na cor dele. */
  highlight?: string;
  highlightColor?: string;
  /** Distância até a base da tela — fica acima da navbar, não sobre ela. */
  bottom: number;
  onUndo: () => void;
  onHide: () => void;
};

/** Quanto tempo o toast espera antes de sumir sozinho. */
const TOAST_MS = 4200;

/**
 * Aviso do que acabou de acontecer, com a saída de emergência junto.
 *
 * Mover é a única ação do app que muda várias coisas de lugar de uma vez sem
 * pedir confirmação — o "Desfazer" aqui é o que torna isso aceitável. Ele
 * some sozinho, então a ação não fica pendurada esperando resposta.
 */
export function Toast({
  visible,
  message,
  highlight,
  highlightColor = colors.primary,
  bottom,
  onUndo,
  onHide,
}: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  /**
   * `onHide` chega novo a cada render do pai, e o pai re-renderiza a cada
   * rolagem da grade. Lido por ref, o efeito depende só de `visible` — sem
   * isso o contador reiniciaria enquanto se rola e o toast nunca sumiria.
   */
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return;

    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => onHideRef.current(), TOAST_MS);
    return () => clearTimeout(timer);
  }, [enter, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          bottom,
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <CheckIcon size={22} color={game.correct.main} />

      <View style={styles.text}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
          {highlight ? (
            <Text style={[styles.highlight, { color: highlightColor }]}>
              {' '}
              {highlight}
            </Text>
          ) : null}
        </Text>
      </View>

      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Desfazer"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text style={styles.undo}>Desfazer</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.toast,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // A sombra tira o toast do plano da grade — sem ela ele parece mais um
    // item da lista que flutuou.
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
  },
  text: {
    flex: 1,
  },
  message: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  highlight: {
    fontFamily: font.bodyBlack,
  },
  undo: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
});

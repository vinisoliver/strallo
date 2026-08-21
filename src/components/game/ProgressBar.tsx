import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, game } from '@/theme';

type Props = {
  /**
   * Quanto da rodada já passou, de 0 a 1. No modo por quantidade é o número
   * de cartões respondidos; no modo por tempo, ver `animateToEndIn`.
   */
  progress: number;
  /**
   * Modo por tempo: milissegundos até o fim. A barra corre sozinha até o
   * limite em vez de dar saltos a cada segundo, o que a deixa contínua.
   */
  animateToEndIn?: number;
  /** Pausa a corrida do tempo (enquanto a resposta está na tela). */
  paused?: boolean;
};

export function ProgressBar({ progress, animateToEndIn, paused }: Props) {
  const value = useRef(new Animated.Value(progress)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animation.current?.stop();

    // Sem tempo definido (modo por quantidade): a barra só acompanha os
    // cartões respondidos, com um passo curto para não piscar.
    if (animateToEndIn === undefined) {
      animation.current = Animated.timing(value, {
        toValue: progress,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      });
      animation.current.start();
      return;
    }

    if (paused || animateToEndIn <= 0) {
      value.stopAnimation();
      return;
    }

    animation.current = Animated.timing(value, {
      toValue: 1,
      duration: animateToEndIn,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.current.start();

    return () => {
      animation.current?.stop();
    };
  }, [animateToEndIn, paused, progress, value]);

  const width = value.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 16,
    borderRadius: 10,
    backgroundColor: game.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
});

import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, font, layout, radius } from '@/theme';

type Props = {
  /** Letras exibidas, de cima para baixo. */
  letters: string[];
  /** Quais delas têm cartões — as demais aparecem apagadas. */
  activeLetters: Set<string>;
  /**
   * Letra do cartão que está no topo da grade — é ela que ganha a pílula
   * amarela. `null` (nenhum cartão salvo) não destaca nada.
   */
  currentLetter: string | null;
  onSelectLetter: (letter: string) => void;
};

/**
 * Barra alfabética vertical à direita da grade. Substitui a barra de rolagem:
 * tocar ou deslizar sobre uma letra leva a grade até ela. A altura de cada
 * letra vem da altura disponível, então o rail preenche a tela inteira em
 * qualquer aparelho.
 */
export function AlphabetRail({
  letters,
  activeLetters,
  currentLetter,
  onSelectLetter,
}: Props) {
  const [height, setHeight] = useState(0);
  /**
   * Letra sob o dedo. É só do balão flutuante: ele acompanha o arraste mesmo
   * por letras sem cartão, enquanto a pílula amarela marca onde a grade está.
   * `null` quando o dedo sai do rail — aí o balão some.
   */
  const [dragLetter, setDragLetter] = useState<string | null>(null);

  const railRef = useRef<View>(null);

  // Lidos de dentro do PanResponder, criado uma única vez.
  const heightRef = useRef(0);
  /** Topo do rail em coordenadas de tela, para converter o `pageY` do toque. */
  const topRef = useRef(0);
  const lettersRef = useRef(letters);
  const lastLetterRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelectLetter);

  lettersRef.current = letters;
  onSelectRef.current = onSelectLetter;

  const itemHeight = height > 0 ? height / letters.length : 0;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // O rail é vertical: impede que a grade role junto durante o arraste.
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (event) => {
          handleTouch(event.nativeEvent.pageY);
        },
        onPanResponderMove: (event) => {
          handleTouch(event.nativeEvent.pageY);
        },
        onPanResponderRelease: clearDrag,
        onPanResponderTerminate: clearDrag,
      }),
    [],
  );

  function clearDrag() {
    setDragLetter(null);
    lastLetterRef.current = null;
  }

  /**
   * `pageY` é a posição do dedo na tela inteira. Usar `locationY` aqui não
   * serve: ele vem relativo ao elemento sob o dedo, então ao passar sobre uma
   * letra o valor reinicia perto de zero e o cálculo cai sempre na primeira
   * letra do rail.
   */
  function handleTouch(pageY: number) {
    const all = lettersRef.current;
    const total = heightRef.current;
    if (total <= 0 || all.length === 0) return;

    const offsetY = pageY - topRef.current;

    // Dedo fora do rail (acima ou abaixo): nada selecionado, balão some.
    if (offsetY < 0 || offsetY >= total) {
      if (lastLetterRef.current !== null) clearDrag();
      return;
    }

    const slot = total / all.length;
    const index = Math.min(all.length - 1, Math.floor(offsetY / slot));
    const letter = all[index];

    // Evita repetir a mesma letra a cada pixel do arraste.
    if (letter === lastLetterRef.current) return;
    lastLetterRef.current = letter;
    setDragLetter(letter);
    onSelectRef.current(letter);
  }

  /**
   * Mede onde o rail está na tela. `measureInWindow` e o `pageY` do toque usam
   * o mesmo referencial, então dá para converter um no outro.
   */
  function handleLayout() {
    railRef.current?.measureInWindow((_x, y, _width, measuredHeight) => {
      topRef.current = y;
      heightRef.current = measuredHeight;
      setHeight(measuredHeight);
    });
  }

  const bubbleIndex = dragLetter ? letters.indexOf(dragLetter) : -1;

  return (
    <View
      ref={railRef}
      style={styles.rail}
      onLayout={handleLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Índice alfabético"
      {...panResponder.panHandlers}
    >
      {bubbleIndex >= 0 && itemHeight > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.bubble,
            { top: bubbleIndex * itemHeight + itemHeight / 2 - 17 },
          ]}
        >
          <Text style={styles.bubbleText}>{dragLetter}</Text>
        </View>
      ) : null}

      {letters.map((letter) => {
        const isCurrent = letter === currentLetter;
        const isActive = activeLetters.has(letter);

        return (
          <View
            key={letter}
            // Os slots não participam do toque: quem responde é o rail
            // inteiro, para o cálculo de posição não depender do alvo.
            pointerEvents="none"
            style={[styles.slot, itemHeight > 0 && { height: itemHeight }]}
          >
            {isCurrent ? (
              <View style={styles.currentPill}>
                <Text style={styles.currentText} allowFontScaling={false}>
                  {letter}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.letter, !isActive && styles.letterIdle]}
                allowFontScaling={false}
              >
                {letter}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: layout.railWidth,
    alignItems: 'center',
    justifyContent: 'center',
    // Sem padding vertical de propósito: os slots preenchem exatamente a
    // altura medida, então o toque mapeia direto para a letra.
  },
  slot: {
    minHeight: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.railActive,
  },
  letterIdle: {
    fontFamily: font.bodyBold,
    color: colors.railIdle,
  },
  currentPill: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentText: {
    fontFamily: font.bodyBlack,
    fontSize: 14,
    color: colors.onPrimary,
  },
  bubble: {
    position: 'absolute',
    right: 36,
    width: 34,
    height: 34,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.tile,
    borderTopRightRadius: radius.tile,
    borderBottomLeftRadius: radius.tile,
    borderBottomRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryShadow,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bubbleText: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 24,
    color: colors.onPrimary,
  },
});

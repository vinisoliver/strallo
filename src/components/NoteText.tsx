import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, font, game } from '@/theme';
import { buildSegments, type Mark } from '@/utils/notes';

type Formatting = {
  text: string;
  marks: Mark[];
  /** A referência do cartão, que acende sozinha onde aparecer. */
  reference: string;
  /** O significado do cartão, que também acende — em outra cor. */
  meaning?: string;
};

/**
 * Os pedaços formatados de uma nota, prontos para virar filhos de um `Text`
 * **ou de um `TextInput`**.
 *
 * Existe separado do componente porque o `TextInput` do React Native aceita
 * `Text` aninhados como filhos, e é assim que o texto aparece formatado
 * enquanto se digita. O que ele não aceita é `value` junto com filhos — os
 * filhos passam a ser o conteúdo.
 */
export function noteSpans({
  text,
  marks,
  reference,
  meaning = '',
}: Formatting): ReactNode[] {
  return buildSegments(text, marks, reference, meaning).map(
    (segment, index) => (
      <Text
        // A posição é a identidade: os pedaços não são reordenados, são
        // recalculados inteiros a cada mudança do texto.
        key={index}
        style={[
          segment.highlight === 'reference' && styles.reference,
          segment.highlight === 'meaning' && styles.meaning,
          segment.underlined && styles.underlined,
        ]}
      >
        {segment.text}
      </Text>
    ),
  );
}

/**
 * Uma nota já formatada, para leitura.
 *
 * O sublinhado usa `textDecorationColor` em vez de uma borda: borda é uma
 * caixa, e num texto que quebra em duas linhas ela só apareceria embaixo da
 * última. O sublinhado nativo acompanha cada linha, que é o que se espera.
 */
export function NoteText({
  style,
  numberOfLines,
  ...formatting
}: Formatting & {
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[styles.base, style]} numberOfLines={numberOfLines}>
      {noteSpans(formatting)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: font.bodySemi,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textProse,
  },
  /** O que se está aprendendo: o amarelo da marca. */
  reference: {
    fontFamily: font.bodyBlack,
    color: colors.primary,
  },
  /**
   * O significado usa o verde de resposta certa do jogo.
   *
   * Não é enfeite: no jogo, o significado **é** a resposta, e o verde já quer
   * dizer "acertou". Ver o mesmo verde na nota liga as duas telas sem
   * precisar de legenda.
   */
  meaning: {
    fontFamily: font.bodyBlack,
    color: game.correct.soft,
  },
  underlined: {
    // A letra continua branca; só a linha é amarela.
    color: colors.text,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
});

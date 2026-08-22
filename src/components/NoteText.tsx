import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, font } from '@/theme';
import { buildSegments, type Mark } from '@/utils/notes';

type Props = {
  text: string;
  marks: Mark[];
  /** A referência do cartão, que acende sozinha onde aparecer. */
  reference: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/**
 * Uma nota com as duas formatações.
 *
 * O sublinhado usa `textDecorationColor` em vez de uma borda: borda é uma
 * caixa, e num texto que quebra em duas linhas ela só apareceria embaixo da
 * última. O sublinhado nativo acompanha cada linha, que é o que se espera.
 */
export function NoteText({
  text,
  marks,
  reference,
  style,
  numberOfLines,
}: Props) {
  const segments = buildSegments(text, marks, reference);

  return (
    <Text style={[styles.base, style]} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => (
        <Text
          // A posição é a identidade aqui: os pedaços não são reordenados,
          // eles são recalculados inteiros a cada mudança do texto.
          key={index}
          style={[
            segment.reference && styles.reference,
            segment.underlined && styles.underlined,
          ]}
        >
          {segment.text}
        </Text>
      ))}
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
  reference: {
    fontFamily: font.bodyBlack,
    color: colors.primary,
  },
  underlined: {
    // A letra continua branca; só a linha é amarela.
    color: colors.text,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
});

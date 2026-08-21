import { StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { colors, radius } from '@/theme';

/**
 * Caixa de seleção no canto do cartão.
 *
 * No modo de seleção **todos** os itens ganham uma, vazia — é o que anuncia
 * que agora um toque marca em vez de abrir. O fundo da tela não escurece:
 * quem sinaliza o modo é a caixa, não um véu.
 */
export function SelectionBox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.box, checked && styles.checked]}>
      {checked ? <CheckIcon /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 24,
    height: 24,
    borderRadius: radius.check,
    borderWidth: 2,
    borderColor: colors.selectBox,
    backgroundColor: colors.selectBoxFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

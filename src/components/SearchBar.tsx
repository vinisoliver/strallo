import { StyleSheet, TextInput, View } from 'react-native';

import { SearchIcon } from '@/components/icons';
import { colors, font, radius } from '@/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  /** Muda dentro de uma coleção, onde a busca só olha para o que está ali. */
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar cartão',
}: Props) {
  return (
    <View style={styles.field}>
      <SearchIcon />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: 14,
    // O TextInput já traz altura própria; o padding vertical vem dele no
    // Android para não cortar descendentes.
    height: 50,
  },
  input: {
    flex: 1,
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
});

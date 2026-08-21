import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import type { Collection } from '@/db/collections';
import { colors, font } from '@/theme';

type Props = {
  /** Do Início até onde se está, sem incluir o Início. */
  path: Collection[];
  /** `index` é a posição em `path`; `-1` é o Início. */
  onNavigate: (index: number) => void;
};

/**
 * Caminho da árvore. É por ele que se volta: tocar em "Início" ou num nome
 * anterior sobe direto para aquele nível, sem passar pelos do meio.
 *
 * O último item é onde se está agora e não navega — fica em amarelo na folha
 * de mover (onde marca o destino) e em branco no cabeçalho da coleção aberta.
 */
export function Breadcrumb({ path, onNavigate }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Caminhos longos rolam em vez de espremer os nomes; o fim, que é o
      // nível atual, é a parte que precisa estar visível.
      contentContainerStyle={styles.content}
    >
      <Crumb
        label="Início"
        current={path.length === 0}
        onPress={() => onNavigate(-1)}
      />

      {path.map((collection, index) => (
        <View key={collection.id} style={styles.step}>
          <ChevronRightIcon />
          <Crumb
            label={collection.name}
            current={index === path.length - 1}
            onPress={() => onNavigate(index)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function Crumb({
  label,
  current,
  onPress,
}: {
  label: string;
  current: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={current}
      accessibilityRole="button"
      accessibilityLabel={current ? `${label}, nível atual` : `Voltar para ${label}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Text style={[styles.crumb, current && styles.current]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crumb: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.textSecondary,
  },
  current: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
});

import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import type { Collection } from '@/db/collections';
import { colors, font } from '@/theme';
import { ELLIPSIS, planCrumbs } from '@/utils/breadcrumb';

type Props = {
  /** Do Início até onde se está, sem incluir o Início. */
  path: Collection[];
  /** `index` é a posição em `path`; `-1` é o Início. */
  onNavigate: (index: number) => void;
};

const GAP = 8;

/** Largura folgada para medir os nomes sem que nenhum seja cortado. */
const MEASURE_WIDTH = 10000;

/**
 * Caminho da árvore. É por ele que se volta: tocar em "Início" ou num nome
 * anterior sobe direto para aquele nível.
 *
 * **O fim é a parte que importa.** Antes isto rolava na horizontal, preso à
 * esquerda: numa árvore funda, com nomes compridos, a tela mostrava "Início ›
 * Alguma pasta de nome enorme ›" e a coleção aberta ficava fora do
 * enquadramento — justamente a única que precisava estar visível.
 *
 * Agora o caminho encolhe pelo meio, e quem decide o que cabe é
 * `planCrumbs`. As larguras são medidas de verdade, numa linha invisível,
 * porque estimar pelo número de letras erra bastante numa fonte de largura
 * variável.
 */
export function Breadcrumb({ path, onNavigate }: Props) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});

  const labels = useMemo(
    () => ['Início', ...path.map((collection) => collection.name)],
    [path],
  );

  // A largura depende do texto, não da posição: guardar por rótulo dispensa
  // remedir a cada navegação e sobrevive a subir e descer na mesma pasta.
  const pending = useMemo(
    () => [ELLIPSIS, ...labels].filter((label) => widths[label] === undefined),
    [labels, widths],
  );

  const measure = (label: string) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setWidths((current) =>
      current[label] === undefined ? { ...current, [label]: width } : current,
    );
  };

  const plan = useMemo(
    () => planCrumbs(labels, widths, boxWidth),
    [labels, widths, boxWidth],
  );

  const last = labels.length - 1;

  return (
    <View
      style={styles.row}
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
    >
      {plan === null ? null : (
        <>
          <Crumb
            label="Início"
            current={last === 0}
            onPress={() => onNavigate(-1)}
          />

          {plan.hiddenUpTo === null ? null : (
            <View style={styles.step}>
              <ChevronRightIcon />
              <Crumb
                label={ELLIPSIS}
                current={false}
                onPress={() => onNavigate(plan.hiddenUpTo! - 1)}
              />
            </View>
          )}

          {plan.tail.map((index) => (
            <View
              key={path[index - 1].id}
              style={[styles.step, index === last && styles.shrinkable]}
            >
              <ChevronRightIcon />
              <Crumb
                label={path[index - 1].name}
                current={index === last}
                onPress={() => onNavigate(index - 1)}
              />
            </View>
          ))}
        </>
      )}

      {pending.length === 0 ? null : (
        <View style={styles.measuring} pointerEvents="none">
          {pending.map((label) => (
            <Text key={label} style={styles.crumb} onLayout={measure(label)}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
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
      accessibilityLabel={
        label === ELLIPSIS
          ? 'Voltar para um nível acima'
          : current
            ? `${label}, nível atual`
            : `Voltar para ${label}`
      }
      style={({ pressed }) => [styles.crumbBox, pressed && styles.pressed]}
    >
      <Text style={[styles.crumb, current && styles.current]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  /**
   * Só o nível atual encolhe.
   *
   * Um nome sozinho pode ser mais largo que a tela, e aí não há o que planejar:
   * ele fica e é cortado com reticências. Deixar os ancestrais encolherem
   * junto espremeria todos até virarem "Ver…" — o caminho pararia de ser
   * legível para caber.
   */
  shrinkable: {
    flexShrink: 1,
  },
  crumbBox: {
    flexShrink: 1,
  },
  crumb: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.textSecondary,
  },
  current: {
    color: colors.text,
  },
  /**
   * Linha de medição: fora do fluxo, invisível e larga o bastante para os
   * nomes serem medidos inteiros, sem o corte que a largura real imporia.
   */
  measuring: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MEASURE_WIDTH,
    flexDirection: 'row',
    opacity: 0,
  },
  pressed: {
    opacity: 0.6,
  },
});

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FolderMoveIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/icons';
import { colors, font } from '@/theme';

type Props = {
  /** Quantos itens estão marcados — é o que liga e desliga cada ação. */
  count: number;
  paddingBottom: number;
  onGroup: () => void;
  onMove: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Barra fixa do modo de seleção.
 *
 * As ações aparecem conforme o que faz sentido para o tamanho da seleção:
 * **Agrupar** só existe com 2 ou mais (agrupar um item só seria mover), e
 * **Editar** só com exatamente 1 — com vários ela fica visível mas apagada,
 * para a barra não mudar de largura a cada toque.
 */
export function SelectionBar({
  count,
  paddingBottom,
  onGroup,
  onMove,
  onEdit,
  onDelete,
}: Props) {
  return (
    <View style={[styles.bar, { paddingBottom }]}>
      {count >= 2 ? (
        <Action
          label="Agrupar"
          color={colors.primary}
          icon={<FolderPlusIcon />}
          onPress={onGroup}
        />
      ) : null}

      <Action label="Mover" icon={<FolderMoveIcon />} onPress={onMove} />

      <Action
        label="Editar"
        icon={<PencilIcon size={24} color={colors.railActive} />}
        onPress={onEdit}
        disabled={count !== 1}
      />

      <Action
        label="Excluir"
        color={colors.dangerSoft}
        icon={<TrashIcon size={24} />}
        onPress={onDelete}
      />
    </View>
  );
}

type ActionProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

function Action({ label, icon, onPress, color, disabled }: ActionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.action,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.label, color ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: colors.borderDim,
    backgroundColor: colors.selectionBar,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.railActive,
  },
});


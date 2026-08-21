import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breadcrumb } from '@/components/Breadcrumb';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ChevronRightIcon, FolderIcon, PlusIcon } from '@/components/icons';
import { alpha, colors, font, layout, radius } from '@/theme';
import { type CollectionTree } from '@/utils/collections';

type Props = {
  visible: boolean;
  title: string;
  /** Linha de apoio: quantos itens vão, ou onde o cartão vai parar. */
  subtitle: string;
  confirmLabel: string;
  tree: CollectionTree;
  /** Onde a folha abre — a coleção de onde a ação partiu. */
  startAt: number | null;
  /**
   * Coleções que não podem ser destino, com tudo que está dentro delas.
   *
   * Ao mover, são as próprias coleções sendo movidas: pôr "Verbos" dentro de
   * "Verbos › Irregulares" arrancaria o galho da árvore junto com o ramo. Ao
   * escolher a coleção de um cartão, fica vazio.
   */
  excludeIds?: number[];
  onConfirm: (targetId: number | null) => void;
  onCreateCollection: (parentId: number | null) => void;
  onCancel: () => void;
};

/**
 * Folha de escolher coleção: as coleções de **um nível por vez**, sem recuo.
 *
 * A alternativa era uma árvore inteira com recuo por profundidade; foi
 * descartada no design. Aqui a linha só diz "esta coleção existe", e onde ela
 * fica é assunto do caminho logo acima — que é também por onde se volta.
 * Tocar numa linha entra nela; o botão de confirmar aceita o nível que o
 * caminho está apontando, inclusive o próprio Início.
 *
 * Serve dois fluxos com o mesmo desenho: **mover** a seleção da grade, e
 * escolher **onde um cartão vai morar** na tela de edição.
 */
export function CollectionPicker({
  visible,
  title,
  subtitle,
  confirmLabel,
  tree,
  startAt,
  excludeIds,
  onConfirm,
  onCreateCollection,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<number | null>(startAt);

  // Abrir de novo recomeça de onde a seleção estava, não de onde a navegação
  // parou da última vez.
  useEffect(() => {
    if (visible) setCurrent(startAt);
  }, [startAt, visible]);

  const path = tree.pathTo(current);

  const excluded = excludeIds ?? [];
  const blocked = new Set(excluded);
  const options = tree
    .childrenOf(current)
    .filter(
      (collection) =>
        !blocked.has(collection.id) &&
        !excluded.some((id) => tree.isDescendantOf(collection.id, id)),
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.scrim}
        onPress={onCancel}
        accessibilityLabel="Cancelar"
      />

      <View style={styles.anchor} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 10 },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Breadcrumb
            path={path}
            onNavigate={(index) => setCurrent(index < 0 ? null : path[index].id)}
          />

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {options.length === 0 ? (
              <Text style={styles.empty}>
                {path.length === 0
                  ? 'Nenhuma coleção ainda. Crie a primeira aqui embaixo.'
                  : 'Nada dentro desta coleção.'}
              </Text>
            ) : (
              options.map((collection) => {
                const stats = tree.statsOf(collection.id);
                const total = stats.cards + stats.collections;

                return (
                  <Pressable
                    key={collection.id}
                    onPress={() => setCurrent(collection.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${collection.name}`}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <FolderIcon size={24} color={collection.color} />
                    <Text style={styles.rowName} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    {total > 0 ? (
                      <Text style={styles.rowCount}>{total}</Text>
                    ) : null}
                    <ChevronRightIcon size={18} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable
            onPress={() => onCreateCollection(current)}
            accessibilityRole="button"
            accessibilityLabel="Nova coleção"
            style={({ pressed }) => [
              styles.create,
              pressed && styles.rowPressed,
            ]}
          >
            <PlusIcon size={22} />
            <Text style={styles.createLabel}>Nova coleção</Text>
          </Pressable>

          <View style={styles.buttonRow}>
            <PrimaryButton
              label={confirmLabel}
              onPress={() => onConfirm(current)}
            />
          </View>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            style={({ pressed }) => [
              styles.cancel,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.scrim,
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: layout.gutter,
    paddingTop: 22,
    // Nunca ocupa a tela toda: a grade continua aparecendo atrás do véu, e é
    // ela que dá o contexto de onde os itens estão saindo.
    maxHeight: '85%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  subtitle: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
    marginTop: 2,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.field,
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.borderMenu,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowName: {
    flex: 1,
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.text,
  },
  rowCount: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  empty: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 18,
    textAlign: 'center',
  },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: alpha.primaryDash,
    borderRadius: radius.field,
    backgroundColor: alpha.primaryFill,
    marginBottom: 14,
  },
  createLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 15,
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  cancel: {
    height: layout.buttonHeight,
    borderRadius: radius.field,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelPressed: {
    backgroundColor: colors.input,
  },
  cancelLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
});

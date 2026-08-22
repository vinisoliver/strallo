import { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { NoteText } from '@/components/NoteText';
import {
  GripIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons';
import type { Note } from '@/db/notes';
import { alpha, colors, font, radius } from '@/theme';
import { MAX_NOTES } from '@/utils/notes';

type Props = {
  notes: Note[];
  /** A referência do cartão, que acende dentro das notas. */
  reference: string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
};

/** Vão entre as notas, também usado na conta do arraste. */
const GAP = 9;

/** Altura de uma nota de uma linha, enquanto a real não foi medida. */
const FALLBACK_HEIGHT = 52;

/**
 * As notas do cartão, na ordem em que ficam.
 *
 * A alça fica à esquerda e o menu à direita de propósito: são as duas ações
 * que competem pelo mesmo toque, e separá-las nas pontas evita abrir o menu
 * quando se quis arrastar.
 */
export function NoteList({
  notes,
  reference,
  onAdd,
  onEdit,
  onRemove,
  onReorder,
}: Props) {
  const [menu, setMenu] = useState<{
    index: number;
    top: number;
    right: number;
  } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const heights = useRef<number[]>([]);
  const offset = useRef(new Animated.Value(0)).current;

  // O arraste vive em refs porque o PanResponder é criado uma vez só: se
  // lesse o estado, veria para sempre o valor da primeira renderização.
  const index = useRef<number | null>(null);
  const baseline = useRef(0);
  const order = useRef(notes);
  order.current = notes;

  // Os callbacks abaixo são criados uma vez e vivem enquanto a tela viver.
  // Ler a prop por ref evita que eles chamem para sempre a versão que
  // existia na primeira renderização.
  const reorder = useRef(onReorder);
  reorder.current = onReorder;

  const full = notes.length >= MAX_NOTES;

  /**
   * Um responder por posição da lista.
   *
   * Um só não serviria: ele precisa saber qual bloco o dedo pegou, e essa
   * informação vem de qual alça foi tocada. São no máximo seis, criados sob
   * demanda e reaproveitados — o bloco que estava na posição continua sendo
   * atendido pelo mesmo responder mesmo depois de trocar de lugar, porque
   * quem manda dali em diante é `index`, atualizado a cada troca.
   */
  const responders = useRef<
    Record<number, ReturnType<typeof PanResponder.create>>
  >({});

  const responderFor = (slot: number) => {
    responders.current[slot] ??= PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => grab(slot),

      onPanResponderMove: (_, gesture) => {
        const current = index.current;
        if (current === null) return;

        const dy = gesture.dy - baseline.current;

        // Passou de meia altura da vizinha: troca de lugar já, e desconta a
        // altura dela do ponto de partida, para o bloco continuar exatamente
        // sob o dedo em vez de dar um pulo.
        if (dy < 0 && current > 0) {
          const step = (heights.current[current - 1] ?? FALLBACK_HEIGHT) + GAP;
          if (-dy > step / 2) {
            reorder.current(current, current - 1);
            swapHeights(heights.current, current, current - 1);
            index.current = current - 1;
            baseline.current -= step;
            setDragging(current - 1);
            offset.setValue(gesture.dy - baseline.current);
            return;
          }
        }

        if (dy > 0 && current < order.current.length - 1) {
          const step = (heights.current[current + 1] ?? FALLBACK_HEIGHT) + GAP;
          if (dy > step / 2) {
            reorder.current(current, current + 1);
            swapHeights(heights.current, current, current + 1);
            index.current = current + 1;
            baseline.current += step;
            setDragging(current + 1);
            offset.setValue(gesture.dy - baseline.current);
            return;
          }
        }

        offset.setValue(dy);
      },

      onPanResponderRelease: () => stop(),
      onPanResponderTerminate: () => stop(),
    });

    return responders.current[slot];
  };

  function stop() {
    index.current = null;
    baseline.current = 0;
    offset.setValue(0);
    setDragging(null);
  }

  const grab = (at: number) => {
    index.current = at;
    baseline.current = 0;
    offset.setValue(0);
    setDragging(at);
  };

  const measure = (at: number) => (event: LayoutChangeEvent) => {
    heights.current[at] = event.nativeEvent.layout.height;
  };

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.label}>Notas</Text>
        <Text style={styles.count}>
          {notes.length} de {MAX_NOTES}
        </Text>
      </View>

      <View style={styles.list}>
        {notes.map((note, at) => (
          <Animated.View
            key={note.uuid}
            onLayout={measure(at)}
            style={[
              styles.note,
              dragging === at && styles.noteDragging,
              dragging === at && {
                transform: [{ translateY: offset }],
                zIndex: 2,
              },
            ]}
          >
            <View
              {...responderFor(at).panHandlers}
              accessibilityRole="adjustable"
              accessibilityLabel={`Mudar a ordem da nota ${at + 1}`}
              style={styles.grip}
            >
              <GripIcon
                color={dragging === at ? colors.primary : colors.railIdle}
              />
            </View>

            <View style={styles.body}>
              <NoteText
                text={note.text}
                marks={note.marks}
                reference={reference}
              />
            </View>

            <Pressable
              onPress={(event) =>
                setMenu({
                  index: at,
                  top: event.nativeEvent.pageY + 14,
                  right: 20,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Opções da nota ${at + 1}`}
              hitSlop={8}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}
            >
              <MoreIcon
                color={
                  menu?.index === at ? colors.primary : colors.textSecondary
                }
              />
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Pressable
        onPress={onAdd}
        disabled={full}
        accessibilityRole="button"
        accessibilityState={{ disabled: full }}
        accessibilityLabel="Adicionar nota"
        style={({ pressed }) => [
          styles.add,
          full && styles.addOff,
          pressed && styles.pressed,
        ]}
      >
        <PlusIcon
          size={20}
          color={full ? colors.disabledText : colors.primary}
        />
        <Text style={[styles.addLabel, full && styles.addLabelOff]}>
          {full ? `Máximo de ${MAX_NOTES} notas` : 'Nova nota'}
        </Text>
      </Pressable>

      <Modal
        visible={menu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
      >
        <Pressable style={styles.menuScrim} onPress={() => setMenu(null)}>
          {menu ? (
            <View style={[styles.menu, { top: menu.top, right: menu.right }]}>
              <Pressable
                onPress={() => {
                  const at = menu.index;
                  setMenu(null);
                  onEdit(at);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, pressed && styles.itemOn]}
              >
                <PencilIcon size={19} color={colors.text} />
                <Text style={styles.itemLabel}>Editar</Text>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                onPress={() => {
                  const at = menu.index;
                  setMenu(null);
                  onRemove(at);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, pressed && styles.itemOn]}
              >
                <TrashIcon size={19} />
                <Text style={[styles.itemLabel, styles.itemDanger]}>
                  Excluir
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function swapHeights(list: number[], a: number, b: number): void {
  const held = list[a];
  list[a] = list[b];
  list[b] = held;
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  count: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.disabledText,
  },

  list: { gap: GAP, marginBottom: 12 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.borderMenu,
    borderRadius: 14,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 11,
  },
  noteDragging: {
    borderColor: colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  grip: { paddingTop: 2, paddingRight: 2 },
  body: { flex: 1, minWidth: 0 },
  more: { paddingTop: 2, paddingLeft: 2 },

  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: alpha.primaryDash,
    borderRadius: 14,
    backgroundColor: alpha.primaryFill,
  },
  addOff: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  addLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 14,
    color: colors.primary,
  },
  addLabelOff: { color: colors.disabledText },

  menuScrim: { flex: 1, backgroundColor: 'rgba(5,10,12,.35)' },
  menu: {
    position: 'absolute',
    width: 168,
    backgroundColor: colors.toast,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  itemOn: { backgroundColor: colors.surface },
  itemLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 15,
    color: colors.text,
  },
  itemDanger: { color: colors.dangerSoft },
  divider: { height: 2, backgroundColor: colors.borderMenu },

  pressed: { opacity: 0.75 },
});

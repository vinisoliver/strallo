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
import { slotAt } from '@/utils/reorder';

type Props = {
  notes: Note[];
  /** A referência do cartão, que acende dentro das notas. */
  reference: string;
  /** O significado do cartão, que acende em verde onde for escrito. */
  meaning: string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
};

/** Vão entre as notas, também usado na conta do arraste. */
const GAP = 9;

/** Altura de uma nota de uma linha, enquanto a real não foi medida. */
const FALLBACK_HEIGHT = 52;

/** Enquanto o dedo está na tela: de onde o bloco saiu e onde ele cairia. */
type Drag = { from: number; target: number };

/**
 * As notas do cartão, na ordem em que ficam.
 *
 * A alça fica à esquerda e o menu à direita de propósito: são as duas ações
 * que competem pelo mesmo toque, e separá-las nas pontas evita abrir o menu
 * quando se quis arrastar.
 *
 * **A lista não é reordenada durante o arraste.** A primeira versão trocava
 * os itens de lugar a cada cruzamento de fronteira, e o resultado era o bloco
 * pulando de um lado para o outro: cada troca reposicionava o ponto de
 * partida bem em cima do limite seguinte, e o menor tremor do dedo disparava
 * a troca de volta. Agora os dados só mudam quando o dedo sai da tela; até
 * lá, o que se move são as transformações — o bloco segue o dedo exatamente,
 * e os vizinhos abrem espaço.
 */
export function NoteList({
  notes,
  reference,
  meaning,
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
  const [drag, setDrag] = useState<Drag | null>(null);

  const heights = useRef<number[]>([]);
  /** Topo de cada posição, congelado quando o arraste começa. */
  const tops = useRef<number[]>([]);
  const offset = useRef(new Animated.Value(0)).current;

  // O gesto vive em refs porque os responders são criados uma vez só: se
  // lessem o estado, veriam para sempre o da primeira renderização.
  const from = useRef<number | null>(null);
  const target = useRef(0);
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
        const start = from.current;
        if (start === null) return;

        offset.setValue(gesture.dy);

        // O meio do bloco arrastado, na régua congelada no início.
        const middle = tops.current[start] + heightAt(start) / 2 + gesture.dy;
        const next = slotAt(
          middle,
          tops.current,
          heightAt,
          order.current.length,
          target.current,
        );

        if (next !== target.current) {
          target.current = next;
          setDrag({ from: start, target: next });
        }
      },

      onPanResponderRelease: stop,
      onPanResponderTerminate: stop,
    });

    return responders.current[slot];
  };

  function stop() {
    const start = from.current;
    from.current = null;
    offset.setValue(0);
    setDrag(null);

    // A ordem só muda agora, uma vez, com o dedo já fora da tela.
    if (start !== null && target.current !== start) {
      reorder.current(start, target.current);
    }
  }

  const heightAt = (at: number) => heights.current[at] ?? FALLBACK_HEIGHT;

  const grab = (at: number) => {
    // Os topos são calculados uma vez, no começo: durante o arraste as
    // posições reais estão deslocadas pelas transformações, e medir de novo
    // devolveria o layout já movido.
    let top = 0;
    tops.current = order.current.map((_, i) => {
      const value = top;
      top += heightAt(i) + GAP;
      return value;
    });

    from.current = at;
    target.current = at;
    offset.setValue(0);
    setDrag({ from: at, target: at });
  };

  /** Quanto cada vizinho anda para abrir espaço no lugar do arrastado. */
  const shiftOf = (at: number): number => {
    if (!drag || at === drag.from) return 0;

    const room = heightAt(drag.from) + GAP;
    if (drag.target > drag.from && at > drag.from && at <= drag.target) {
      return -room;
    }
    if (drag.target < drag.from && at >= drag.target && at < drag.from) {
      return room;
    }
    return 0;
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
        {notes.map((note, at) => {
          const held = drag?.from === at;

          return (
            <Animated.View
              key={note.uuid}
              onLayout={measure(at)}
              style={[
                styles.note,
                held && styles.noteHeld,
                held
                  ? { transform: [{ translateY: offset }], zIndex: 2 }
                  : { transform: [{ translateY: shiftOf(at) }] },
              ]}
            >
              <View
                {...responderFor(at).panHandlers}
                accessibilityRole="adjustable"
                accessibilityLabel={`Mudar a ordem da nota ${at + 1}`}
                style={styles.grip}
              >
                <GripIcon color={held ? colors.primary : colors.railIdle} />
              </View>

              <View style={styles.body}>
                <NoteText
                  text={note.text}
                  marks={note.marks}
                  reference={reference}
                  meaning={meaning}
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
                style={({ pressed }) => [
                  styles.more,
                  pressed && styles.pressed,
                ]}
              >
                <MoreIcon
                  color={
                    menu?.index === at ? colors.primary : colors.textSecondary
                  }
                />
              </Pressable>
            </Animated.View>
          );
        })}
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
          {full ? `Limite de ${MAX_NOTES} notas atingido` : 'Nova nota'}
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
  noteHeld: {
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

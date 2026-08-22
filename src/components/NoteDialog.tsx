import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { noteSpans } from '@/components/NoteText';
import { StarIcon, UnderlineIcon } from '@/components/icons';
import { alpha, colors, font, layout, radius } from '@/theme';
import {
  MAX_LENGTH,
  normalizeMarks,
  shiftMarks,
  type Mark,
} from '@/utils/notes';

type Props = {
  visible: boolean;
  /** A referência do cartão, que acende dentro do campo. */
  reference: string;
  /** O significado do cartão, que acende em verde onde for escrito. */
  meaning: string;
  /** Preenchidos ao editar; vazios ao criar. */
  initialText?: string;
  initialMarks?: Mark[];
  onCancel: () => void;
  onConfirm: (text: string, marks: Mark[]) => void;
};

type Selection = { start: number; end: number };

/**
 * Escreve ou edita uma nota, já formatada enquanto se digita.
 *
 * O `TextInput` aceita `Text` aninhados como **filhos**, e é assim que o
 * sublinhado e os realces aparecem dentro do próprio campo. O preço é que
 * `value` deixa de poder ser usado: o React Native recusa os dois juntos, e
 * os filhos passam a ser o conteúdo. Quem guarda o texto é o estado daqui, e
 * a cada tecla os filhos são refeitos.
 */
export function NoteDialog({
  visible,
  reference,
  meaning,
  initialText = '',
  initialMarks = [],
  onCancel,
  onConfirm,
}: Props) {
  const [text, setText] = useState(initialText);
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const input = useRef<TextInput>(null);

  // O modal não desmonta entre uma abertura e outra, então o conteúdo precisa
  // ser reposto a cada vez — senão a nota seguinte abriria com o texto da
  // anterior.
  useEffect(() => {
    if (!visible) return;
    setText(initialText);
    setMarks(normalizeMarks(initialMarks, initialText.length));
    setSelection({ start: initialText.length, end: initialText.length });
  }, [visible, initialText, initialMarks]);

  const trimmed = text.trim();
  const selecting = selection.end > selection.start;
  const covered = isCovered(marks, selection);

  const change = (next: string) => {
    setMarks((current) => shiftForEdit(current, text, next));
    setText(next);
  };

  const toggleUnderline = () => {
    if (!selecting) return;

    setMarks((current) =>
      covered
        ? subtract(current, selection.start, selection.end)
        : normalizeMarks(
            [...current, [selection.start, selection.end]],
            text.length,
          ),
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>
              {initialText ? 'Editar nota' : 'Nova nota'}
            </Text>

            <Text style={styles.label}>Texto</Text>

            <TextInput
              ref={input}
              onChangeText={change}
              onSelectionChange={(event) =>
                setSelection(event.nativeEvent.selection)
              }
              maxLength={MAX_LENGTH}
              multiline
              autoFocus
              placeholder="Uma frase, um dado, um lembrete…"
              placeholderTextColor={colors.disabledText}
              style={styles.input}
            >
              {noteSpans({ text, marks, reference, meaning })}
            </TextInput>

            <View style={styles.tools}>
              <Pressable
                onPress={toggleUnderline}
                disabled={!selecting}
                accessibilityRole="button"
                accessibilityState={{ disabled: !selecting, selected: covered }}
                accessibilityLabel={
                  covered ? 'Tirar o sublinhado' : 'Sublinhar o trecho'
                }
                style={({ pressed }) => [
                  styles.tool,
                  !selecting && styles.toolOff,
                  pressed && styles.pressed,
                ]}
              >
                <UnderlineIcon
                  color={selecting ? colors.primary : colors.disabledText}
                />
                <Text
                  style={[
                    styles.toolLabel,
                    !selecting && styles.toolLabelOff,
                  ]}
                >
                  {covered ? 'Tirar linha' : 'Sublinhar'}
                </Text>
              </Pressable>

              <Text style={styles.counter}>
                {text.length}
                <Text style={styles.counterMax}> / {MAX_LENGTH}</Text>
              </Text>
            </View>

            <View style={styles.hint}>
              <StarIcon size={16} />
              <Text style={styles.hintText}>
                A referência do cartão ficará destacada.
              </Text>
            </View>

            <Pressable
              onPress={() => onConfirm(trimmed, normalizeMarks(marks, text.length))}
              disabled={trimmed.length === 0}
              accessibilityRole="button"
              accessibilityState={{ disabled: trimmed.length === 0 }}
              style={({ pressed }) => [
                styles.confirm,
                trimmed.length === 0 && styles.confirmOff,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.confirmLabel,
                  trimmed.length === 0 && styles.confirmLabelOff,
                ]}
              >
                {initialText ? 'Salvar' : 'Adicionar'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Reposiciona as marcas depois de o texto mudar.
 *
 * O `TextInput` entrega o texto novo inteiro, sem dizer o que mudou. O trecho
 * alterado é deduzido comparando as pontas: o que sobrou igual no começo e no
 * fim delimita a região mexida. Acerta o caso que importa — digitar e apagar —
 * e, no pior caso, o sublinhado some, que é melhor do que ficar torto.
 */
function shiftForEdit(marks: Mark[], before: string, after: string): Mark[] {
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before[prefix] === after[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < max - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return shiftMarks(
    marks,
    prefix,
    before.length - prefix - suffix,
    after.length - prefix - suffix,
  );
}

/** A seleção inteira já está sublinhada? */
function isCovered(marks: Mark[], selection: Selection): boolean {
  if (selection.end <= selection.start) return false;
  return marks.some(
    ([start, end]) => start <= selection.start && end >= selection.end,
  );
}

/** Tira o pedaço `[from, to)` das marcas, partindo as que o contêm. */
function subtract(marks: Mark[], from: number, to: number): Mark[] {
  const out: Mark[] = [];

  for (const [start, end] of marks) {
    if (end <= from || start >= to) {
      out.push([start, end]);
      continue;
    }
    if (start < from) out.push([start, from]);
    if (end > to) out.push([to, end]);
  }

  return normalizeMarks(out, Number.MAX_SAFE_INTEGER);
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5,10,12,.66)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  title: {
    fontFamily: font.display,
    fontSize: 24,
    color: colors.text,
    marginBottom: 18,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.field,
    backgroundColor: colors.input,
    paddingHorizontal: 15,
    paddingVertical: 14,
    minHeight: 104,
    fontFamily: font.bodySemi,
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.textProse,
    textAlignVertical: 'top',
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 16,
  },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: alpha.primaryChip,
  },
  toolOff: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  toolLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.primary,
  },
  toolLabelOff: { color: colors.disabledText },
  counter: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    color: colors.textSecondary,
  },
  counterMax: { fontFamily: font.bodyBold, color: colors.disabledText },

  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 20,
  },
  hintText: {
    flex: 1,
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  confirm: {
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOff: {
    backgroundColor: colors.disabled,
    borderBottomColor: colors.disabled,
  },
  confirmLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 17,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onPrimary,
  },
  confirmLabelOff: { color: colors.disabledText },

  cancel: { height: 52, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.textSecondary,
  },

  pressed: { opacity: 0.75 },
});

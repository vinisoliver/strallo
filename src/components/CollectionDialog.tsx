import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import {
  COLLECTION_COLORS,
  DEFAULT_COLLECTION_COLOR,
  alpha,
  colors,
  font,
  layout,
  radius,
} from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  /** Linha de apoio — usada ao agrupar, para lembrar quantos itens vão junto. */
  subtitle?: string;
  confirmLabel: string;
  /** Preenchidos ao editar uma coleção que já existe. */
  initialName?: string;
  initialColor?: string;
  onConfirm: (name: string, color: string) => void;
  onCancel: () => void;
};

/** As dez cores em duas linhas de cinco, como na artboard. */
const SWATCH_ROWS = [
  COLLECTION_COLORS.slice(0, 5),
  COLLECTION_COLORS.slice(5),
];

/**
 * Criar, editar ou agrupar numa coleção — o mesmo modal nos três casos, já
 * que os campos são os mesmos e só muda o título e o botão.
 *
 * As cores são dez, fixas, numa grade 5×2. Um seletor livre daria coleções
 * quase iguais entre si; com uma paleta fechada a cor vira um jeito de
 * reconhecer a pasta de longe.
 */
export function CollectionDialog({
  visible,
  title,
  subtitle,
  confirmLabel,
  initialName = '',
  initialColor,
  onConfirm,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? DEFAULT_COLLECTION_COLOR);
  const [focused, setFocused] = useState(false);

  const enter = useRef(new Animated.Value(0)).current;

  // Reabrir o modal recomeça do zero (ou do que veio para edição): sem isto o
  // nome digitado numa criação cancelada reapareceria na próxima.
  useEffect(() => {
    if (!visible) return;

    setName(initialName);
    setColor(initialColor ?? DEFAULT_COLLECTION_COLOR);
    setFocused(false);

    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [enter, initialColor, initialName, visible]);

  const trimmed = name.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.scrim}
        onPress={onCancel}
        accessibilityLabel="Cancelar"
      />

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: enter,
              transform: [
                {
                  scale: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <Text style={styles.label}>Nome</Text>
          <View style={[styles.field, focused && styles.fieldFocused]}>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Verbos"
              placeholderTextColor={colors.disabledText}
              style={styles.input}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
              onSubmitEditing={() => {
                if (trimmed.length > 0) onConfirm(trimmed, color);
              }}
              accessibilityLabel="Nome da coleção"
            />
          </View>

          <Text style={styles.label}>Cor</Text>
          {/* Duas linhas de cinco, montadas na mão. `flexWrap` com `gap`
              quebraria em posições diferentes conforme a largura da tela, e a
              grade 5×2 do design é parte do desenho. */}
          <View style={styles.swatches}>
            {SWATCH_ROWS.map((row, index) => (
              <View key={index} style={styles.swatchRow}>
                {row.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setColor(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: option === color }}
                    accessibilityLabel={`Cor ${option}`}
                    // O anel branco fica num pai com padding, e não numa borda
                    // do próprio quadradinho: uma borda comeria a área da cor e
                    // o escolhido pareceria menor que os outros.
                    style={[
                      styles.swatchWrap,
                      option === color && styles.swatchWrapOn,
                    ]}
                  >
                    <View style={[styles.swatch, { backgroundColor: option }]} />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <PrimaryButton
              label={confirmLabel}
              disabled={trimmed.length === 0}
              onPress={() => onConfirm(trimmed, color)}
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
        </Animated.View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  subtitle: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginTop: 18,
    marginBottom: 8,
  },
  field: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    backgroundColor: colors.input,
    paddingHorizontal: 16,
    height: 54,
    justifyContent: 'center',
  },
  fieldFocused: {
    borderColor: colors.primary,
  },
  input: {
    fontFamily: font.bodyBold,
    fontSize: 17,
    color: colors.text,
    padding: 0,
  },
  swatches: {
    gap: 12,
    marginBottom: 24,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatchWrap: {
    flex: 1,
    padding: 4,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderRadius: 18,
  },
  swatchWrapOn: {
    borderColor: colors.text,
  },
  swatch: {
    height: 44,
    borderRadius: radius.chip,
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

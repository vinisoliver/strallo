import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { alpha, colors, font, layout, radius } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** Texto do botão que confirma — a ação destrutiva, em vermelho. */
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmação no visual do app, no lugar do alerta do sistema.
 *
 * O alerta nativo quebra o tom da interface: fonte, cantos e cores são os do
 * Android/iOS, não os do strallo. Este diálogo usa a mesma superfície dos
 * cartões e o mesmo botão com borda inferior "3D" do resto do app.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [enter, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Tocar fora cancela — nunca confirma. */}
      <Pressable
        style={styles.scrim}
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
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
          <Text style={styles.message}>{message}</Text>

          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            style={({ pressed }) => [
              styles.confirm,
              pressed && styles.confirmPressed,
            ]}
          >
            <Text style={styles.confirmLabel}>{confirmLabel}</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [
              styles.cancel,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
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
    paddingHorizontal: 26,
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
    textAlign: 'center',
  },
  message: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  confirm: {
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.danger,
    borderBottomWidth: 4,
    borderBottomColor: '#b84545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPressed: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  confirmLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 17,
    letterSpacing: 0.8,
    color: '#3a1010',
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

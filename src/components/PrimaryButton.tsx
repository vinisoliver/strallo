import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, font, layout, radius } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  /** Cor do botão. O padrão é o amarelo da marca. */
  color?: string;
  /** Borda inferior mais escura, o efeito "3D". */
  shadow?: string;
  /** Cor do texto sobre o botão. */
  textColor?: string;
};

/**
 * Botão amarelo com a borda inferior mais escura — o efeito "3D" que o
 * design descreve como `box-shadow: 0 4px 0 #c99a00`. Ao pressionar, o botão
 * desce os 4px da borda, como no Duolingo.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  color = colors.primary,
  shadow = colors.primaryShadow,
  textColor = colors.onPrimary,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, borderBottomColor: shadow },
        // Desativado não é o botão amarelo apagado: é uma superfície neutra,
        // como no design, para não parecer que ainda dá para tocar.
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <Text
          style={[
            styles.label,
            { color: textColor },
            disabled && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: radius.field,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderBottomWidth: 0,
    marginTop: 4,
  },
  disabledLabel: {
    color: colors.disabledText,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 17,
    letterSpacing: 0.8,
  },
});

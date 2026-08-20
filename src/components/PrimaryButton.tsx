import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, font, layout, radius } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * Botão amarelo com a borda inferior mais escura — o efeito "3D" que o
 * design descreve como `box-shadow: 0 4px 0 #c99a00`. Ao pressionar, o botão
 * desce os 4px da borda, como no Duolingo.
 */
export function PrimaryButton({ label, onPress, icon, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.45,
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
    color: colors.onPrimary,
  },
});

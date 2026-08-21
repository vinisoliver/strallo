import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import {
  BackIcon,
  CountIcon,
  MinusIcon,
  PlusStepIcon,
  TimeIcon,
} from '@/components/icons';
import { MODE_SETTINGS, type GameMode } from '@/game/types';
import { colors, font, game, layout, radius } from '@/theme';

export default function ConfigScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode: GameMode }>();
  const mode: GameMode = params.mode === 'count' ? 'count' : 'time';

  const settings = MODE_SETTINGS[mode];
  const palette = mode === 'time' ? game.time : game.count;
  const [value, setValue] = useState<number>(settings.default);

  const canDecrease = value > settings.min;
  const canIncrease = value < settings.max;

  const change = (delta: number) => {
    setValue((current) =>
      Math.min(settings.max, Math.max(settings.min, current + delta)),
    );
  };

  return (
    <View style={styles.screen}>
      {/* Mesmo cabeçalho da tela de edição: voltar, título, espaçador. */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <BackIcon />
        </Pressable>

        <Text style={styles.headerTitle}>Praticar</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* O modo escolhido continua visível, na cor dele */}
      <View style={styles.chipRow}>
        <View
          style={[
            styles.chip,
            { backgroundColor: palette.chipBg, borderColor: palette.border },
          ]}
        >
          {mode === 'time' ? <TimeIcon size={24} /> : <CountIcon size={24} />}
          <Text style={[styles.chipText, { color: palette.soft }]}>
            {mode === 'time' ? 'Por tempo' : 'Por quantidade'}
          </Text>
        </View>
      </View>

      <Text style={styles.question}>
        {mode === 'time' ? 'Quanto tempo de jogo?' : 'Quantos cartões?'}
      </Text>

      <View style={styles.stepperArea}>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => change(-settings.step)}
            disabled={!canDecrease}
            accessibilityRole="button"
            accessibilityLabel="Diminuir"
            style={({ pressed }) => [
              styles.stepButton,
              !canDecrease && styles.stepDisabled,
              pressed && canDecrease && styles.pressed,
            ]}
          >
            <MinusIcon />
          </Pressable>

          <View style={styles.readout}>
            <Text style={[styles.value, { color: palette.main }]}>{value}</Text>
            <Text style={styles.unit}>
              {mode === 'time' ? 'segundos' : 'cartões'}
            </Text>
          </View>

          <Pressable
            onPress={() => change(settings.step)}
            disabled={!canIncrease}
            accessibilityRole="button"
            accessibilityLabel="Aumentar"
            style={({ pressed }) => [
              styles.stepButton,
              {
                backgroundColor: palette.main,
                borderBottomColor: palette.shadow,
                borderWidth: 0,
                borderBottomWidth: 5,
              },
              !canIncrease && styles.stepDisabled,
              pressed && canIncrease && styles.pressed,
            ]}
          >
            <PlusStepIcon color={palette.on} />
          </Pressable>
        </View>

        <Text style={styles.hint}>
          {mode === 'time'
            ? `ajuste de ${settings.step} em ${settings.step} segundos`
            : `ajuste de ${settings.step} em ${settings.step} cartão`}
        </Text>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 14 },
        ]}
      >
        <PrimaryButton
          label="COMEÇAR"
          onPress={() =>
            router.replace({
              pathname: '/practice/play',
              params: { mode, limit: String(value) },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 42 },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  pressed: { opacity: 0.75 },
  chipRow: { alignItems: 'center', marginTop: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  chipText: { fontFamily: font.display, fontSize: 19, lineHeight: 25 },
  question: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: 26,
    paddingHorizontal: 28,
  },
  stepperArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepButton: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.4 },
  readout: { alignItems: 'center', minWidth: 120 },
  value: { fontFamily: font.display, fontSize: 64, lineHeight: 70 },
  unit: {
    fontFamily: font.bodyBlack,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginTop: 2,
  },
  hint: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: '#556670',
  },
  footer: { flexDirection: 'row', paddingHorizontal: layout.gutter },
});

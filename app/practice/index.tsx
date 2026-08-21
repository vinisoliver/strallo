import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { PrimaryButton } from '@/components/PrimaryButton';
import { BackIcon, CountIcon, TimeIcon } from '@/components/icons';
import { countPlayableCards, drawCards, type Card } from '@/db/cards';
import type { GameMode } from '@/game/types';
import { colors, font, game, layout, radius } from '@/theme';

export default function ChooseModeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<GameMode | null>(null);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<Card | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([countPlayableCards(db), drawCards(db, 1)]).then(
        ([count, sample]) => {
          if (!active) return;
          setTotal(count);
          setPreview(sample[0] ?? null);
        },
      );

      return () => {
        active = false;
      };
    }, [db]),
  );

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

      <View style={styles.deckArea}>
        <Text style={styles.title}>Hora do desafio!</Text>

        <View style={styles.deckGroup}>
          <View style={styles.deck}>
            <View style={[styles.deckCard, styles.deckBack]} />
            <View style={[styles.deckCard, styles.deckMiddle]} />
            <View style={[styles.deckCard, styles.deckFront]}>
              <Text style={styles.deckText} numberOfLines={1}>
                {preview?.reference ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countNumber}>{total}</Text>
            <Text style={styles.countText}>
              {total === 1 ? 'cartão pronto' : 'cartões prontos'}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 14 },
        ]}
      >
        <Text style={styles.label}>Escolha um modo</Text>

        <View style={styles.modes}>
          <ModeOption
            selected={mode === 'time'}
            onPress={() => setMode('time')}
            icon={<TimeIcon />}
            name="Por tempo"
            description={'Corra contra\no relógio'}
          />
          <ModeOption
            selected={mode === 'count'}
            onPress={() => setMode('count')}
            icon={<CountIcon />}
            name="Por quantidade"
            description={'Com número fixo\nde cartões'}
          />
        </View>

        {/* O botão tem flex:1 para dividir uma linha; numa coluna ele
            disputaria altura com o resto e apareceria espremido. */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            label="PROSSEGUIR"
            disabled={mode === null || total === 0}
            onPress={() =>
              router.push({
                pathname: '/practice/config',
                params: { mode: mode ?? 'time' },
              })
            }
          />
        </View>

        {total === 0 ? (
          <Text style={styles.empty}>
            Adicione cartões com significado para poder praticar.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type ModeOptionProps = {
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  name: string;
  description: string;
};

/** Um dos dois modos. Selecionar destaca a borda; não navega sozinho. */
function ModeOption({
  selected,
  onPress,
  icon,
  name,
  description,
}: ModeOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.mode,
        selected && styles.modeSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <View>
        <Text style={styles.modeName}>{name}</Text>
        <Text style={styles.modeDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
  headerSpacer: {
    width: 42,
  },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  pressed: {
    opacity: 0.75,
  },
  title: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 40,
    color: colors.text,
    textAlign: 'center',
  },
  deckArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // O título respira longe do baralho; o baralho e a contagem andam juntos.
    gap: 64,
  },
  deckGroup: {
    alignItems: 'center',
    gap: 16,
  },
  deck: {
    width: 210,
    height: 144,
  },
  deckCard: {
    position: 'absolute',
    left: 21,
    width: 168,
    height: 118,
    borderRadius: 22,
    borderWidth: 2,
  },
  deckBack: {
    top: 0,
    backgroundColor: '#1a262c',
    borderColor: '#2b3840',
    transform: [{ rotate: '-8deg' }],
  },
  deckMiddle: {
    top: 7,
    backgroundColor: colors.input,
    borderColor: '#32424b',
    transform: [{ rotate: '5deg' }],
  },
  deckFront: {
    top: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckText: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
    paddingHorizontal: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  countNumber: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.primary,
  },
  countText: {
    fontFamily: font.bodyBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: layout.gutter,
  },
  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#556670',
    marginBottom: 12,
  },
  modes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  mode: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  modeSelected: {
    borderColor: colors.primary,
  },
  modeName: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
  modeDescription: {
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 3,
  },
  empty: {
    fontFamily: font.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});

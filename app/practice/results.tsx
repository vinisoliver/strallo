import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { PrimaryButton } from '@/components/PrimaryButton';
import { HomeIcon, RestartIcon } from '@/components/icons';
import type { GameMode } from '@/game/types';
import { colors, font, game, layout, radius } from '@/theme';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode: GameMode;
    limit: string;
    correct: string;
    answered: string;
    elapsed: string;
    collection?: string;
  }>();

  const mode: GameMode = params.mode === 'count' ? 'count' : 'time';
  const correct = Number(params.correct) || 0;
  const answered = Number(params.answered) || 0;
  const elapsed = Number(params.elapsed) || 0;
  const wrong = Math.max(0, answered - correct);

  const headline = pickHeadline(correct, answered);

  return (
    <View style={styles.screen}>
      <View style={[styles.body, { paddingTop: insets.top + 20 }]}>
        <Trophy />

        <Text style={styles.title}>{headline.title}</Text>
        <Text style={styles.subtitle}>{headline.subtitle}</Text>

        <View style={styles.boxes}>
          <View style={[styles.box, { borderColor: game.time.border }]}>
            <View style={[styles.boxTop, { backgroundColor: game.time.main }]}>
              <Text style={[styles.boxLabel, { color: game.time.on }]}>
                Tempo
              </Text>
            </View>
            <View style={styles.boxBody}>
              <Text style={[styles.boxValue, { color: game.time.soft }]}>
                {formatClock(elapsed)}
              </Text>
              <Text style={styles.boxUnit}>
                {mode === 'time' ? 'de rodada' : 'até o fim'}
              </Text>
            </View>
          </View>

          <View style={[styles.box, { borderColor: game.correct.border }]}>
            <View
              style={[styles.boxTop, { backgroundColor: game.correct.main }]}
            >
              <Text style={[styles.boxLabel, { color: game.correct.on }]}>
                Acertos
              </Text>
            </View>
            <View style={styles.boxBody}>
              <Text style={[styles.boxValue, { color: game.correct.soft }]}>
                {correct} / {answered}
              </Text>
              <Text
                style={[
                  styles.boxUnit,
                  wrong > 0 && { color: colors.danger },
                ]}
              >
                {wrong === 0
                  ? 'sem erros'
                  : `${wrong} ${wrong === 1 ? 'erro' : 'erros'}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.actions,
          { paddingBottom: Math.max(insets.bottom, 16) + 14 },
        ]}
      >
        <Pressable
          onPress={() => router.dismissAll()}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
          style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
        >
          <HomeIcon />
        </Pressable>

        <PrimaryButton
          label="RECOMEÇAR"
          icon={<RestartIcon />}
          onPress={() =>
            router.replace({
              pathname: '/practice/config',
              params: {
                mode,
                limit: params.limit,
                ...(params.collection
                  ? { collection: params.collection }
                  : {}),
              },
            })
          }
        />
      </View>
    </View>
  );
}

/** O texto muda com o desempenho — elogiar uma rodada ruim soa falso. */
function pickHeadline(correct: number, answered: number) {
  if (answered === 0) {
    return {
      title: 'Rodada encerrada',
      subtitle: 'Nenhum cartão foi respondido dessa vez',
    };
  }

  const ratio = correct / answered;

  if (ratio >= 0.8) {
    return {
      title: 'Muito bem!',
      subtitle: 'Você mandou muito bem nessa rodada',
    };
  }
  if (ratio >= 0.5) {
    return { title: 'Boa rodada', subtitle: 'Dá para melhorar na próxima' };
  }
  return { title: 'Foi looonge', subtitle: 'Revisar os erros ajuda a fixar' };
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Troféu da marca — mesmo desenho da canvas. */
function Trophy() {
  return (
    <Svg width={180} height={150} viewBox="0 0 180 150" fill="none">
      <Path
        d="M30 40l3.5 8.5 8.5 3.5-8.5 3.5L30 64l-3.5-8.5L18 52l8.5-3.5L30 40z"
        fill="#ffe27a"
      />
      <Path
        d="M147 32l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5 2.5-6z"
        fill={colors.primary}
      />
      <Path d="M152 78l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#ffe27a" />
      <Path
        d="M58 44H43c0 17 6 26 17 28"
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M112 44h15c0 17-6 26-17 28"
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M57 34h56v20c0 15.5-12.5 28-28 28S57 69.5 57 54V34z"
        fill={colors.primary}
      />
      <Path
        d="M85 44l4.5 9.5 10.5 1.5-7.5 7.5 1.5 10.5-9-5-9 5 1.5-10.5-7.5-7.5 10.5-1.5L85 44z"
        fill={colors.onPrimary}
      />
      <Path
        d="M85 82v16"
        stroke={colors.primary}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <Path
        d="M68 104h34c2.2 0 4 1.8 4 4v6H64v-6c0-2.2 1.8-4 4-4z"
        fill={colors.primary}
      />
      <Rect
        x={58}
        y={118}
        width={54}
        height={11}
        rx={5.5}
        fill={colors.primaryShadow}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  title: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 42,
    color: colors.primary,
    marginTop: 24,
  },
  subtitle: {
    fontFamily: font.bodySemi,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  boxes: { flexDirection: 'row', gap: 14, width: '100%', marginTop: 30 },
  box: {
    flex: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  boxTop: { paddingVertical: 7, alignItems: 'center' },
  boxLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  boxBody: { padding: 16, alignItems: 'center' },
  boxValue: { fontFamily: font.display, fontSize: 30, lineHeight: 38 },
  boxUnit: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: layout.gutter,
    paddingTop: 12,
  },
  homeButton: {
    width: 64,
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});

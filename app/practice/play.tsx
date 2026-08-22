import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { recordSession } from '@/db/sessions';

import { GameCard } from '@/components/game/GameCard';
import { ProgressBar } from '@/components/game/ProgressBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CheckIcon, CloseIcon, CountIcon, TimeIcon } from '@/components/icons';
import { drawCards, type Card } from '@/db/cards';
import { isAnswerAccepted } from '@/game/answer';
import { CARD_SWAP_MS, FEEDBACK_IN_MS, type GameMode } from '@/game/types';
import { colors, font, game, layout, radius } from '@/theme';

type Phase = 'asking' | 'feedback';

export default function PlayScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode: GameMode;
    limit: string;
    collection?: string;
  }>();

  const mode: GameMode = params.mode === 'count' ? 'count' : 'time';
  const limit = Number(params.limit) || (mode === 'time' ? 60 : 20);
  /** Rodada de uma coleção: só os cartões dela e das que estão dentro dela. */
  const collectionId = Number(params.collection) || null;

  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('asking');
  const [wasCorrect, setWasCorrect] = useState(false);
  const [given, setGiven] = useState('');
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(mode === 'time' ? limit : 0);
  const [askingExit, setAskingExit] = useState(false);

  const startedAt = useRef(Date.now());
  const feedbackIn = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const initialWindowHeight = useRef(Dimensions.get('window').height).current;
  const topHeaderHeight = insets.top + 113;
  const footerHeight = 135 + Math.max(insets.bottom, 16);
  const cardContentHeight = 261;
  const availableSpace = initialWindowHeight - topHeaderHeight - footerHeight;
  const cardTopPadding = Math.max(
    16,
    Math.round((availableSpace - cardContentHeight) / 2),
  );

  // Baralho: no modo por quantidade já vem cortado no tamanho pedido.
  useEffect(() => {
    let active = true;
    drawCards(db, mode === 'count' ? limit : undefined, collectionId).then(
      (cards) => {
        if (active) setDeck(cards);
      },
    );
    return () => {
      active = false;
    };
  }, [collectionId, db, limit, mode]);

  const finish = useCallback(
    (finalCorrect: number, finalAnswered: number) => {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);

      // A rodada é registrada aqui, e não na tela de resultado: o resultado
      // volta a montar no "Recomeçar" e contaria a mesma rodada de novo.
      // Sair pelo X não passa por aqui, e é o que se quer -- desistir no meio
      // não é uma prática concluída.
      void recordSession(db, {
        mode,
        answered: finalAnswered,
        correct: finalCorrect,
        seconds: elapsed,
        collectionId,
      });

      router.replace({
        pathname: '/practice/results',
        params: {
          mode,
          limit: String(limit),
          correct: String(finalCorrect),
          answered: String(finalAnswered),
          elapsed: String(elapsed),
          // Vai junto para o "Recomeçar" cair na mesma coleção.
          ...(collectionId === null
            ? {}
            : { collection: String(collectionId) }),
        },
      });
    },
    [collectionId, db, limit, mode],
  );

  // Relógio do modo por tempo. Pausa enquanto a resposta está na tela: ler o
  // significado não deve custar segundos de jogo.
  useEffect(() => {
    if (mode !== 'time' || phase === 'feedback') return;

    const id = setInterval(() => {
      setSecondsLeft((left) => (left <= 1 ? 0 : left - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [mode, phase]);

  useEffect(() => {
    if (mode === 'time' && secondsLeft === 0 && deck.length > 0) {
      finish(correct, answered);
    }
  }, [answered, correct, deck.length, finish, mode, secondsLeft]);

  const card = deck.length > 0 ? deck[index % deck.length] : null;

  function submit() {
    if (!card || answer.trim().length === 0) return;

    const accepted = isAnswerAccepted(answer, card.meaning);
    setWasCorrect(accepted);
    setGiven(answer.trim());
    setCorrect((value) => value + (accepted ? 1 : 0));
    setAnswered((value) => value + 1);
    setPhase('feedback');

    // Transição curta: o veredito aparece quase junto com o toque.
    feedbackIn.setValue(0);
    Animated.timing(feedbackIn, {
      toValue: 1,
      duration: FEEDBACK_IN_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }
  function next() {
    // Modo por quantidade: acabou o baralho, acabou a rodada.
    if (mode === 'count' && answered >= deck.length) {
      finish(correct, answered);
      return;
    }

    setPhase('asking');
    setAnswer('');
    setIndex((value) => value + 1);
  }

  function confirmExit() {
    setAskingExit(true);
  }

  /**
   * O voltar do aparelho pergunta o mesmo que o X da tela.
   *
   * Sair no meio joga fora a rodada — ela só é registrada quando termina —,
   * então o caminho de saída precisa ser o mesmo pelos dois botões.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (askingExit) {
            setAskingExit(false);
            return true;
          }
          setAskingExit(true);
          return true;
        },
      );

      return () => subscription.remove();
    }, [askingExit]),
  );

  const progress =
    mode === 'count' && deck.length > 0 ? answered / deck.length : 0;

  const palette = wasCorrect ? game.correct : game.wrong;
  const modePalette = mode === 'time' ? game.time : game.count;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.hud, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={confirmExit}
            accessibilityRole="button"
            accessibilityLabel="Sair da rodada"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <CloseIcon size={20} />
          </Pressable>

          <ProgressBar
            progress={progress}
            animateToEndIn={mode === 'time' ? secondsLeft * 1000 : undefined}
            paused={phase === 'feedback'}
          />
        </View>

        <View style={styles.counters}>
          <View style={[styles.counter, { backgroundColor: modePalette.tint }]}>
            {mode === 'time' ? (
              <TimeIcon size={20} color={modePalette.main} />
            ) : (
              <CountIcon size={20} color={modePalette.main} />
            )}
            <Text style={[styles.counterText, { color: modePalette.soft }]}>
              {mode === 'time'
                ? formatClock(secondsLeft)
                : `${Math.min(answered + 1, deck.length || 1)} / ${deck.length}`}
            </Text>
          </View>

          <View style={[styles.counter, { backgroundColor: game.correct.tint }]}>
            <CheckIcon size={20} color={game.correct.main} />
            <Text style={[styles.counterText, { color: game.correct.soft }]}>
              {correct} {correct === 1 ? 'acerto' : 'acertos'}
            </Text>
          </View>
        </View>

        <View style={[styles.cardArea, { paddingTop: cardTopPadding }]}>
          {phase === 'asking' ? (
            <Text style={styles.prompt}>Qual o significado?</Text>
          ) : null}

          {card ? (
            <GameCard
              card={card}
              status={
                phase === 'feedback' ? (wasCorrect ? 'correct' : 'wrong') : 'idle'
              }
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* Campo e veredito ocupam o footer fixado que sobe com o teclado */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.footerWrapper}
      >
        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, 16) + 10 },
          ]}
        >
          {phase === 'asking' ? (
            <>
              <TextInput
                ref={inputRef}
                value={answer}
                onChangeText={setAnswer}
                placeholder="Digite o significado"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={submit}
              />
              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="RESPONDER"
                  onPress={submit}
                  disabled={answer.trim().length === 0}
                />
              </View>
            </>
          ) : (
            <>
              <Animated.View
                style={{
                  opacity: feedbackIn,
                  transform: [
                    {
                      translateY: feedbackIn.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                {wasCorrect ? (
                  <View
                    style={[
                      styles.verdict,
                      {
                        backgroundColor: palette.tint,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View
                      style={[styles.badge, { backgroundColor: palette.main }]}
                    >
                      <CheckIcon size={20} color={palette.on} />
                    </View>
                    <Text style={[styles.verdictTitle, { color: palette.soft }]}>
                      Certo!
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.verdictWrong,
                      {
                        backgroundColor: palette.tint,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.verdictRow}>
                      <View
                        style={[styles.badge, { backgroundColor: palette.main }]}
                      >
                        <CloseIcon size={19} color={palette.on} />
                      </View>
                      <Text style={styles.wrote}>
                        Você escreveu <Text style={styles.struck}>{given}</Text>
                      </Text>
                    </View>

                    <View style={styles.answerBlock}>
                      <Text style={[styles.answerLabel, { color: palette.soft }]}>
                        Resposta
                      </Text>
                      <Text style={styles.answerText}>{card?.meaning}</Text>
                    </View>
                  </View>
                )}
              </Animated.View>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="CONTINUAR"
                  onPress={next}
                  color={palette.main}
                  shadow={palette.shadow}
                  textColor={palette.on}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={askingExit}
        title="Encerrar rodada?"
        message="Se você sair agora, seu progresso nesta rodada será perdido."
        confirmLabel="Sair da rodada"
        cancelLabel="Continuar jogando"
        onConfirm={() => {
          setAskingExit(false);
          router.dismissAll();
        }}
        onCancel={() => setAskingExit(false)}
      />
    </View>
  );
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  footerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderDim,
    paddingTop: 12,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.gutter,
    paddingBottom: 8,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  counters: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: layout.gutter,
    paddingTop: 12,
  },
  counter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.chip,
    paddingVertical: 10,
  },
  counterText: { fontFamily: font.display, fontSize: 19, lineHeight: 25 },
  cardArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  prompt: {
    fontFamily: font.bodyBlack,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#556670',
    marginBottom: 18,
  },
  placeholder: { width: '100%', height: 230 },
  bottom: {
    paddingHorizontal: layout.gutter,
    gap: 14,
    backgroundColor: colors.bg,
  },
  // O botão tem flex:1 para dividir uma linha; sozinho numa coluna ele
  // precisa desta linha própria para não ser espremido.
  buttonRow: { flexDirection: 'row' },
  input: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: font.bodyBold,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.input,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  verdictWrong: {
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictTitle: { fontFamily: font.display, fontSize: 22, lineHeight: 28 },
  wrote: {
    flex: 1,
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  struck: {
    color: game.wrong.soft,
    textDecorationLine: 'line-through',
  },
  answerBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,107,107,.18)',
  },
  answerLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  answerText: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});

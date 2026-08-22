import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { useCloud } from '@/cloud/CloudProvider';
import {
  BackIcon,
  CalendarIcon,
  CloudIcon,
  FolderIcon,
  GoogleIcon,
  PlayIcon,
  SignOutIcon,
  StackIcon,
} from '@/components/icons';
import { loadTotals, type AccountTotals } from '@/db/account';
import { colors, font, game, layout, radius } from '@/theme';

const EMPTY: AccountTotals = { cards: 0, collections: 0, sessions: 0 };

export default function AccountScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const cloud = useCloud();

  const [totals, setTotals] = useState<AccountTotals>(EMPTY);

  // Recarrega ao entrar na tela: criar um cartão, uma coleção ou concluir uma
  // prática muda estes números, e todos acontecem em outras telas.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadTotals(db).then((found) => {
        if (active) setTotals(found);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Conta</Text>
      </View>

      {cloud.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : cloud.status === 'signedIn' && cloud.user ? (
        <SignedIn totals={totals} bottom={insets.bottom} />
      ) : (
        <SignedOut bottom={insets.bottom} />
      )}
    </View>
  );
}

/** Sem conta — e também quando a nuvem ainda não foi configurada. */
function SignedOut({ bottom }: { bottom: number }) {
  const cloud = useCloud();
  const [busy, setBusy] = useState(false);
  const off = cloud.status === 'off';

  const enter = async () => {
    setBusy(true);
    await cloud.signIn();
    setBusy(false);
  };

  return (
    <View style={[styles.body, { paddingBottom: Math.max(bottom, 16) + 10 }]}>
      <View style={styles.emblem}>
        <CloudIcon size={58} color={colors.disabledText} />
      </View>

      <Text style={styles.title}>Você não está sincronizado</Text>
      <Text style={styles.lead}>
        {off
          ? 'A sincronização ainda não foi configurada nesta versão do app.'
          : 'Entre com o Google para guardar uma cópia na nuvem.'}
      </Text>

      <View style={styles.perks}>
        <Perk>
          Trocar de celular <Text style={styles.strong}>sem perder nada</Text> —
          cartões, coleções e progresso voltam no lugar.
        </Perk>
        <Perk>
          Estudar em <Text style={styles.strong}>mais de um aparelho</Text>, com
          tudo igual nos dois.
        </Perk>
        <Perk>
          O app{' '}
          <Text style={styles.strong}>continua funcionando sem internet</Text>: a
          nuvem é cópia, não é o lugar onde os cartões moram.
        </Perk>
      </View>

      <View style={styles.grow} />

      {cloud.error ? <Text style={styles.error}>{cloud.error}</Text> : null}

      <Pressable
        onPress={() => void enter()}
        disabled={off || busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: off || busy }}
        style={({ pressed }) => [
          styles.googleButton,
          off && styles.googleOff,
          pressed && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <GoogleIcon />
            <Text style={[styles.googleLabel, off && styles.googleLabelOff]}>
              Entrar com Google
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function SignedIn({
  totals,
  bottom,
}: {
  totals: AccountTotals;
  bottom: number;
}) {
  const cloud = useCloud();
  const user = cloud.user;
  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.body,
        { paddingBottom: Math.max(bottom, 16) + 10 },
      ]}
    >
      <View style={styles.identity}>
        {user.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      <SyncStatus />

      <Text style={styles.label}>Suas estatísticas</Text>

      <View style={styles.stats}>
        <Stat
          icon={<StackIcon size={21} />}
          value={totals.cards}
          label="Cartões"
        />
        <Stat
          icon={<FolderIcon size={21} color={game.count.main} />}
          value={totals.collections}
          label="Coleções"
        />
        <Stat
          icon={<PlayIcon size={19} color={game.time.main} />}
          value={totals.sessions}
          label="Práticas"
        />
      </View>

      <View style={styles.since}>
        <CalendarIcon />
        <Text style={styles.sinceText}>
          Na Strallo desde{' '}
          <Text style={styles.strong}>{formatDate(user.createdAt)}</Text>
        </Text>
      </View>

      <View style={styles.grow} />

      <Text style={styles.footnote}>
        Sair não apaga os cartões deste aparelho.
      </Text>

      <Pressable
        onPress={() => void cloud.signOut()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <SignOutIcon />
        <Text style={styles.signOutLabel}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

/** A faixa que diz se está tudo salvo, sincronizando, ou se algo falhou. */
function SyncStatus() {
  const { syncing, lastSyncAt, error } = useCloud();

  const tone = error ? game.wrong : syncing ? game.time : game.correct;
  const title = error
    ? 'Não foi possível sincronizar'
    : syncing
      ? 'Sincronizando…'
      : 'Tudo sincronizado';

  const detail = error
    ? error
    : lastSyncAt
      ? `Última vez ${describeWhen(lastSyncAt)}`
      : 'Primeira sincronização a caminho';

  return (
    <View
      style={[
        styles.sync,
        { backgroundColor: tone.tint, borderColor: tone.border },
      ]}
    >
      {syncing ? (
        <ActivityIndicator color={tone.main} style={styles.syncSpinner} />
      ) : (
        <CloudIcon size={26} color={tone.main} synced={!error} />
      )}
      <View style={styles.syncText}>
        <Text style={[styles.syncTitle, { color: tone.soft }]}>{title}</Text>
        <Text style={styles.syncDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkMark}>
        <CheckMark />
      </View>
      <Text style={styles.perkText}>{children}</Text>
    </View>
  );
}

function CheckMark() {
  return (
    <Text style={styles.checkGlyph} accessibilityElementsHidden>
      ✓
    </Text>
  );
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatDate(at: number): string {
  const date = new Date(at);
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** "agora mesmo", "há 8 minutos", "há 3 dias" — precisão não ajuda aqui. */
function describeWhen(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));

  if (seconds < 60) return 'agora mesmo';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  const days = Math.round(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: layout.gutter,
    paddingBottom: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: font.display, fontSize: 20, color: colors.text },

  body: { flexGrow: 1, paddingHorizontal: 22 },
  grow: { flex: 1, minHeight: 24 },

  emblem: {
    width: 112,
    height: 112,
    borderRadius: 34,
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.borderMenu,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 22,
  },
  title: {
    fontFamily: font.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  lead: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 26,
  },

  perks: { gap: 16, paddingHorizontal: 4 },
  perk: { flexDirection: 'row', gap: 12 },
  perkMark: { width: 21, alignItems: 'center' },
  checkGlyph: {
    fontFamily: font.bodyBlack,
    fontSize: 17,
    color: game.correct.main,
  },
  perkText: {
    flex: 1,
    fontFamily: font.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: '#a8bcc7',
  },
  strong: { fontFamily: font.bodyBlack, color: colors.text },

  error: {
    fontFamily: font.bodySemi,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 10,
  },

  googleButton: {
    height: layout.buttonHeight,
    borderRadius: radius.field,
    backgroundColor: colors.text,
    borderBottomWidth: 4,
    borderBottomColor: '#b9c6cd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleOff: {
    backgroundColor: colors.disabled,
    borderBottomColor: colors.disabled,
  },
  googleLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.onPrimary,
  },
  googleLabelOff: { color: colors.disabledText },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 22,
    marginBottom: 20,
  },
  avatar: { width: 72, height: 72, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: game.count.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: font.display,
    fontSize: 32,
    color: game.count.on,
  },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.display, fontSize: 23, color: colors.text },
  email: {
    fontFamily: font.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
  },

  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 22,
  },
  syncSpinner: { width: 26 },
  syncText: { flex: 1, minWidth: 0 },
  syncTitle: { fontFamily: font.bodyBlack, fontSize: 15 },
  syncDetail: {
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  label: {
    fontFamily: font.bodyBlack,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 10,
  },

  stats: { flexDirection: 'row', gap: 11, marginBottom: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
  },
  statValue: { fontFamily: font.display, fontSize: 26, color: colors.text },
  statLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },

  since: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.input,
    borderWidth: 2,
    borderColor: colors.borderMenu,
    borderRadius: radius.field,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  sinceText: {
    flex: 1,
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: '#a8bcc7',
  },

  footnote: {
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.disabledText,
    textAlign: 'center',
    marginBottom: 12,
  },
  signOut: {
    height: layout.buttonHeight,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.dangerBorder,
    backgroundColor: game.wrong.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  signOutLabel: {
    fontFamily: font.bodyBlack,
    fontSize: 16,
    color: colors.dangerSoft,
  },

  pressed: { opacity: 0.75 },
});

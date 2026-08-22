import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { onLocalChange } from '@/cloud/changes';
import { cloudConfigured } from '@/cloud/config';
import {
  SignInCancelled,
  currentUser,
  signIn as googleSignIn,
  signOut as googleSignOut,
  type CloudUser,
} from '@/cloud/auth';
import { syncNow } from '@/cloud/sync';

/**
 * Em que pé está a nuvem.
 *
 * `off` é a ausência de credenciais, e não um erro: o app inteiro funciona
 * assim, e a tela de Conta prefere dizer isso a oferecer um login que
 * falharia.
 */
export type CloudStatus = 'loading' | 'off' | 'signedOut' | 'signedIn';

type CloudValue = {
  status: CloudStatus;
  user: CloudUser | null;
  syncing: boolean;
  /** Quando a última sincronização terminou bem. */
  lastSyncAt: number | null;
  /** Mensagem da última falha, já pronta para a tela. */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  sync: () => void;
};

const CloudContext = createContext<CloudValue | null>(null);

/** Espera antes de subir, para juntar várias mudanças seguidas numa só. */
const SYNC_DEBOUNCE_MS = 2500;

const LAST_SYNC_KEY = 'last_sync_at';

export function CloudProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();

  const [status, setStatus] = useState<CloudStatus>(
    cloudConfigured ? 'loading' : 'off',
  );
  const [user, setUser] = useState<CloudUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A sincronização não pode acontecer duas vezes ao mesmo tempo: as duas
  // leriam a mesma marca e subiriam as mesmas linhas.
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<CloudUser | null>(null);
  userRef.current = user;

  const run = useCallback(async () => {
    const current = userRef.current;
    if (!current || running.current) return;

    running.current = true;
    setSyncing(true);
    try {
      await syncNow(db, current.id);
      const now = Date.now();
      await db.runAsync(
        `INSERT INTO sync_state (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
        [LAST_SYNC_KEY, String(now)],
      );
      setLastSyncAt(now);
      setError(null);
    } catch (cause) {
      setError(describe(cause));
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, [db]);

  const sync = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), SYNC_DEBOUNCE_MS);
  }, [run]);

  // Sessão guardada e horário da última sincronização, na abertura do app.
  useEffect(() => {
    if (!cloudConfigured) return;

    let active = true;

    void (async () => {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM sync_state WHERE key = ?;',
        [LAST_SYNC_KEY],
      );
      const found = await currentUser().catch(() => null);
      if (!active) return;

      if (row) setLastSyncAt(Number(row.value) || null);
      setUser(found);
      setStatus(found ? 'signedIn' : 'signedOut');
      if (found) {
        userRef.current = found;
        void run();
      }
    })();

    return () => {
      active = false;
    };
  }, [db, run]);

  // Toda escrita no banco pede uma subida; o debounce junta as próximas.
  useEffect(() => onLocalChange(sync), [sync]);

  // Voltar para o app é o momento mais provável de o outro aparelho ter
  // mexido em alguma coisa.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => subscription.remove();
  }, [run]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const found = await googleSignIn();
      setUser(found);
      userRef.current = found;
      setStatus('signedIn');
      await run();
    } catch (cause) {
      // Fechar o diálogo do Google é uma escolha, não uma falha para exibir.
      if (cause instanceof SignInCancelled) return;
      setError(describe(cause));
    }
  }, [run]);

  const signOut = useCallback(async () => {
    await googleSignOut();
    setUser(null);
    userRef.current = null;
    setStatus('signedOut');
    setError(null);
  }, []);

  const value = useMemo<CloudValue>(
    () => ({ status, user, syncing, lastSyncAt, error, signIn, signOut, sync }),
    [status, user, syncing, lastSyncAt, error, signIn, signOut, sync],
  );

  return (
    <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
  );
}

export function useCloud(): CloudValue {
  const value = useContext(CloudContext);
  if (!value) throw new Error('useCloud precisa do CloudProvider por volta');
  return value;
}

function describe(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return 'Não foi possível sincronizar';
}

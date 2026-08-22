import type { User as SupabaseUser } from '@supabase/supabase-js';

import { getClient } from '@/cloud/client';
import { googleWebClientId } from '@/cloud/config';

/** A pessoa dona da conta, do jeito que a tela de Conta precisa. */
export type CloudUser = {
  id: string;
  name: string;
  email: string;
  /** URL da foto do Google, ou `null` quando não há. */
  photo: string | null;
  /** Quando a conta passou a existir. */
  createdAt: number;
};

/** Quem cancelou o diálogo do Google não é erro — é uma decisão. */
export class SignInCancelled extends Error {
  constructor() {
    super('Login cancelado');
    this.name = 'SignInCancelled';
  }
}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let cached: GoogleModule | null = null;
let attempted = false;

/**
 * Carrega o módulo do Google **sob demanda**.
 *
 * O `import` estático era um erro: o corpo do módulo chama
 * `TurboModuleRegistry.getEnforcing`, que estoura onde o binário nativo não
 * existe — o Expo Go. Como `_layout` importa esta cadeia inteira, o app
 * inteiro morria na abertura, antes de qualquer verificação ter chance de
 * rodar. Adiando a carga, quem não tem o módulo simplesmente fica sem login,
 * com o resto do app funcionando.
 *
 * A ausência é detectada tentando carregar, e não olhando o ambiente: um
 * build de desenvolvimento e o Expo Go se apresentam igual para
 * `Constants.executionEnvironment`, e o primeiro **tem** o módulo. Perguntar
 * ao próprio módulo é a única resposta que vale nos dois casos.
 */
async function google(): Promise<GoogleModule | null> {
  if (attempted) return cached;
  attempted = true;

  try {
    cached = await import('@react-native-google-signin/google-signin');
  } catch {
    cached = null;
  }

  return cached;
}

/** Se este aparelho consegue abrir o diálogo do Google. */
export async function isGoogleAvailable(): Promise<boolean> {
  return (await google()) !== null;
}

let configured = false;

function configure(module: GoogleModule): void {
  if (configured) return;
  // `webClientId` mesmo no Android: é a audiência que o Supabase valida.
  module.GoogleSignin.configure({ webClientId: googleWebClientId });
  configured = true;
}

/**
 * Entra com o Google e troca o token pela sessão do Supabase.
 *
 * São dois passos porque são dois sistemas: o Google diz quem é a pessoa, e o
 * Supabase decide o que ela pode ler e escrever. O `idToken` é a carta de
 * apresentação que atravessa de um para o outro.
 */
export async function signIn(): Promise<CloudUser> {
  const supabase = getClient();
  if (!supabase) throw new Error('Sincronização não configurada');

  const module = await google();
  if (!module) {
    throw new Error('O login com Google não está disponível nesta versão');
  }

  configure(module);
  await module.GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  const response = await module.GoogleSignin.signIn();
  if (response.type !== 'success') throw new SignInCancelled();

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('O Google não devolveu o token de identificação');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('A sessão não foi criada');

  return toCloudUser(data.user);
}

/**
 * Sai das duas pontas.
 *
 * O Google precisa ser avisado junto: só encerrar a sessão do Supabase
 * deixaria a conta escolhida guardada no aparelho, e o próximo login entraria
 * direto, sem perguntar qual conta — que é o oposto do que alguém espera
 * depois de tocar em "Sair".
 *
 * Nada é apagado do SQLite. Os cartões são do aparelho.
 */
export async function signOut(): Promise<void> {
  const supabase = getClient();
  if (supabase) await supabase.auth.signOut();

  const module = await google();
  if (!module) return;

  try {
    configure(module);
    await module.GoogleSignin.signOut();
  } catch {
    // Sair do Google é higiene, não requisito: se falhar, a sessão que
    // importa (a do Supabase) já caiu.
  }
}

/** A sessão guardada, se ainda houver uma. */
export async function currentUser(): Promise<CloudUser | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user ? toCloudUser(data.user) : null;
}

function toCloudUser(user: SupabaseUser): CloudUser {
  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    name:
      pickString(meta.full_name) ??
      pickString(meta.name) ??
      user.email?.split('@')[0] ??
      'Você',
    email: user.email ?? '',
    photo: pickString(meta.avatar_url) ?? pickString(meta.picture) ?? null,
    createdAt: Date.parse(user.created_at) || Date.now(),
  };
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

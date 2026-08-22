import {
  GoogleSignin,
  type User as GoogleUser,
} from '@react-native-google-signin/google-signin';
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

let configured = false;

function configure(): void {
  if (configured) return;
  // `webClientId` mesmo no Android: é a audiência que o Supabase valida.
  GoogleSignin.configure({ webClientId: googleWebClientId });
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

  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') throw new SignInCancelled();

  const idToken = (response.data as GoogleUser).idToken;
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

  configure();
  try {
    await GoogleSignin.signOut();
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

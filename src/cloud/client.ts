import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { cloudConfigured, supabaseAnonKey, supabaseUrl } from '@/cloud/config';

let client: SupabaseClient | null = null;

/**
 * O client do Supabase, ou `null` quando não há credenciais.
 *
 * Criado sob demanda e uma vez só: dois clients manteriam duas sessões e dois
 * temporizadores de renovação de token.
 */
export function getClient(): SupabaseClient | null {
  if (!cloudConfigured) return null;

  if (client === null) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // A sessão precisa sobreviver ao fechamento do app; o SQLite guarda
        // os cartões, mas o token do Supabase mora aqui.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // Não há URL de retorno: o login acontece pelo diálogo nativo do
        // Google, não por redirecionamento de navegador.
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

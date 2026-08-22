/**
 * Credenciais da nuvem, lidas do ambiente.
 *
 * `EXPO_PUBLIC_*` é embutido no pacote em tempo de build — o que é adequado
 * aqui: a chave anônima do Supabase é pública por natureza, e quem protege os
 * dados é a Row Level Security, não o segredo da chave. Nada de chave de
 * serviço neste arquivo.
 *
 * Sem as três variáveis o app roda igual, só que **sem nuvem**: a tela de
 * Conta avisa que a sincronização ainda não foi configurada em vez de
 * oferecer um login que não funcionaria. É o que permite continuar
 * desenvolvendo enquanto as credenciais não chegam.
 */
export const supabaseUrl = originOf(process.env.EXPO_PUBLIC_SUPABASE_URL);

/**
 * Fica só com a origem do endereço.
 *
 * O painel do Supabase mostra em destaque o endpoint do REST
 * (`.../rest/v1/`), e é fácil copiar esse em vez da URL do projeto. O cliente
 * anexa `/auth/v1` e `/rest/v1` por conta própria, então um caminho já
 * embutido faz o login pedir `/rest/v1/auth/v1/token` e voltar com "Invalid
 * path specified in request url" — um erro que não aponta para a causa.
 *
 * Aparar aqui é seguro: nenhum caminho depois do domínio é válido nesta
 * variável, então não há configuração legítima sendo descartada.
 */
function originOf(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return '';

  const match = /^https?:\/\/[^/]+/i.exec(trimmed);
  return match ? match[0] : trimmed.replace(/\/+$/, '');
}
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * O client **web** do Google, não o android.
 *
 * É o que o Supabase valida no `signInWithIdToken`: o token precisa ter sido
 * emitido para a audiência que o servidor espera. Um client id de Android no
 * lugar deste faz o login passar no aparelho e falhar no servidor, com um
 * erro que não diz isso.
 */
export const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const cloudConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  googleWebClientId.length > 0;

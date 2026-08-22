type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Avisa que algo mudou no banco local.
 *
 * Chamado de dentro das próprias funções de escrita, e não das telas: assim
 * qualquer caminho que crie, edite ou exclua alguma coisa passa por aqui sem
 * que cada tela precise lembrar de avisar. Uma tela nova nasce sincronizando.
 *
 * Quem escuta é o `CloudProvider`, que junta as mudanças de um mesmo momento
 * numa subida só.
 */
export function notifyLocalChange(): void {
  for (const listener of listeners) listener();
}

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

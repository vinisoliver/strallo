import { normalize } from '@/utils/text';

/**
 * Compara a resposta digitada com o significado do cartão.
 *
 * A comparação ignora acentos, maiúsculas e pontuação, e aceita que a pessoa
 * escreva só a primeira parte do significado: o design prevê significados como
 * "Coragem — a capacidade de enfrentar o medo", e exigir a frase inteira
 * tornaria o jogo impraticável. Digitar "coragem" basta.
 *
 * A verificação por IA, que aceitaria respostas de fato aproximadas, ainda não
 * existe — isto é a regra local que a substitui por enquanto.
 */
export function isAnswerAccepted(answer: string, meaning: string): boolean {
  const given = clean(answer);
  if (given.length === 0) return false;

  const expected = clean(meaning);
  if (expected.length === 0) return false;

  if (given === expected) return true;

  // Qualquer uma das alternativas separadas por travessão, vírgula, barra ou
  // ponto-e-vírgula serve como resposta.
  return alternatives(expected).some((option) => option === given);
}

/** Minúsculas, sem acento e sem pontuação nas pontas. */
function clean(value: string): string {
  return normalize(value)
    .replace(/[.!?"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Quebra o significado nos separadores que costumam introduzir uma explicação
 * ou listar sinônimos.
 */
function alternatives(expected: string): string[] {
  return expected
    .split(/\s[-—–]\s|[,;/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

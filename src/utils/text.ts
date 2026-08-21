/** Letras do rail alfabético, na ordem em que aparecem. */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Grupo dos cartões cuja referência não começa por letra (números, símbolos). */
export const OTHER_LETTER = '#';

/**
 * Forma comparável de um texto: sem acentos, em minúsculas, sem espaços nas
 * pontas. É o que vai para `sort_key` (SQLite ordena byte a byte, então a
 * chave precisa já vir normalizada) e o que a busca compara.
 */
export function normalize(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    // Remove os diacríticos separados pelo NFD (faixa combining marks).
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Forma comparável de uma referência para **detectar repetida**.
 *
 * Diferente de `normalize`, esta **mantém o acento**: "café" e "cafe" são
 * duas referências distintas e podem coexistir. O que ela ignora é caixa e
 * espaço nas pontas — "Abandon" e "abandon" são o mesmo cartão.
 *
 * O `toLowerCase` do JavaScript entende Unicode; o `lower()` do SQLite só
 * mexe em A–Z, e por isso a coluna `reference_key` existe em vez de a
 * consulta comparar `lower(reference)`.
 */
export function foldCase(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Letra do rail sob a qual a referência é agrupada. Referências que não
 * começam com A–Z caem em `#`.
 */
export function letterOf(reference: string): string {
  const first = normalize(reference).charAt(0).toUpperCase();
  return ALPHABET.includes(first) ? first : OTHER_LETTER;
}

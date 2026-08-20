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
 * Letra do rail sob a qual a referência é agrupada. Referências que não
 * começam com A–Z caem em `#`.
 */
export function letterOf(reference: string): string {
  const first = normalize(reference).charAt(0).toUpperCase();
  return ALPHABET.includes(first) ? first : OTHER_LETTER;
}

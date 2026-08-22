import * as Crypto from 'expo-crypto';

/**
 * Identidade global de uma linha, gerada no aparelho.
 *
 * O `id` INTEGER do SQLite é único **neste** banco, não entre bancos: dois
 * aparelhos offline criam, os dois, o cartão de `id = 7`, e na hora de subir um
 * sobrescreveria o outro. O uuid resolve isso sem depender de rede — quem
 * cria a linha já sabe o nome dela.
 *
 * O `id` continua mandando dentro do app (todas as telas e consultas já
 * referenciam por ele); o uuid só aparece na fronteira com a nuvem.
 */
export function newId(): string {
  return Crypto.randomUUID();
}

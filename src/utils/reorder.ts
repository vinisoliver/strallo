/**
 * Folga antes de a troca de posição valer.
 *
 * Sem ela o bloco arrastado fica pousado exatamente na fronteira, e o tremor
 * natural do dedo alterna a posição várias vezes por segundo — que era o
 * "pulando" da primeira versão.
 */
export const SLACK = 10;

/**
 * Em que posição um bloco arrastado cairia se o dedo saísse agora.
 *
 * `middle` é o meio vertical do bloco, medido na régua de `tops` — que é
 * congelada quando o arraste começa. Durante o gesto as posições reais estão
 * deslocadas pelas transformações, e medir de novo devolveria o layout já
 * movido.
 *
 * A posição escolhida é a de **centro mais próximo**. Comparar com o centro
 * da vizinha, e não com o meio do caminho até ela, era o erro da primeira
 * versão: exigia percorrer um passo inteiro para trocar, quando meio passo
 * já basta.
 *
 * A folga entra como vantagem para a posição atual — é preciso estar `SLACK`
 * mais perto de outro centro para a troca valer. Isso cria uma zona morta de
 * 2 × `SLACK` em volta de cada fronteira, e é ela que impede a alternância
 * quando o dedo pousa bem em cima do limite.
 */
export function slotAt(
  middle: number,
  tops: number[],
  heightAt: (at: number) => number,
  count: number,
  current: number,
): number {
  let found = current;
  let best = Infinity;

  for (let i = 0; i < count; i += 1) {
    const center = tops[i] + heightAt(i) / 2;
    const distance = Math.abs(middle - center) - (i === current ? SLACK : 0);

    if (distance < best) {
      best = distance;
      found = i;
    }
  }

  return found;
}

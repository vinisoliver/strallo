/**
 * Gera os ícones do app a partir do símbolo da marca.
 *
 * O símbolo é o "st" do logotipo — as três primeiras paths do wordmark, no
 * viewBox 16 10 82 82 (ver PROJECT.md). Desenhar aqui, e não exportar da
 * canvas, mantém os ícones em sincronia com o traçado oficial.
 *
 *   node scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const BACKGROUND = '#131f24';
const STROKE = '#ffc800';

/** As três primeiras paths do logotipo formam o "st". */
const PATHS = [
  { d: 'M58 40 C49 33 33 35 33 46 C33 55 52 53 55 63 C57 72 42 75 30 68', width: 10 },
  { d: 'M70 24 C68 44 67 60 71 74 C73 80 79 79 83 75', width: 10 },
  { d: 'M54 43 C63 41 77 41 86 44', width: 8.5 },
];

const STROKE_GROUP = PATHS.map(
  (path) => `<path d="${path.d}" stroke-width="${path.width}"/>`,
).join('');

/**
 * Caixa que o traçado realmente ocupa, medida pelo rasterizador (o viewBox
 * nominal do símbolo tem folga desigual, e a ponta arredondada do traço ainda
 * soma meia espessura de cada lado). Medir em vez de estimar é o que deixa o
 * "st" opticamente centrado no ícone.
 */
function measureSymbol() {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${STROKE_GROUP}</g>
  </svg>`;

  const box = new Resvg(probe).innerBBox() ?? new Resvg(probe).getBBox();
  if (!box) throw new Error('não foi possível medir o símbolo');

  return box;
}

const SYMBOL = measureSymbol();

/**
 * Monta o SVG do símbolo centralizado numa tela quadrada.
 *
 * @param {number} canvas  lado da imagem final, em px
 * @param {number} symbol  lado que o "st" deve ocupar, em px
 * @param {string|null} background  cor de fundo, ou null para transparente
 */
function buildSvg(canvas, symbol, background) {
  // A maior dimensão do traçado é que define o tamanho pedido; a outra segue
  // proporcional, e as duas ficam centradas na tela.
  const scale = symbol / Math.max(SYMBOL.width, SYMBOL.height);
  const tx = (canvas - SYMBOL.width * scale) / 2 - SYMBOL.x * scale;
  const ty = (canvas - SYMBOL.height * scale) / 2 - SYMBOL.y * scale;

  const fill = background
    ? `<rect width="${canvas}" height="${canvas}" fill="${background}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  ${fill}
  <g transform="translate(${tx} ${ty}) scale(${scale})"
     fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">
    ${STROKE_GROUP}
  </g>
</svg>`;
}

function render(name, svg, canvas) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: canvas },
  })
    .render()
    .asPng();

  writeFileSync(join(ASSETS, name), png);
  console.log(`  ${name} (${canvas}x${canvas}, ${(png.length / 1024).toFixed(1)} KB)`);
}

mkdirSync(ASSETS, { recursive: true });

console.log('Gerando ícones em assets/');
console.log(
  `  símbolo medido: ${SYMBOL.width.toFixed(1)} x ${SYMBOL.height.toFixed(1)}`,
);

// Ícone padrão: símbolo sobre o fundo do app, ocupando ~59% da tela.
render('icon.png', buildSvg(1024, 600, BACKGROUND), 1024);

// Android recorta o adaptive icon em círculo/squircle: o conteúdo precisa
// caber na zona segura central (~66% = 676px), por isso o símbolo vai menor.
// O fundo vem do `backgroundColor` no app.json, então a camada é transparente.
render('adaptive-icon.png', buildSvg(1024, 500, null), 1024);

// Splash: sem fundo, a tela já é #131f24.
render('splash-icon.png', buildSvg(1024, 560, null), 1024);

// Web.
render('favicon.png', buildSvg(48, 28, BACKGROUND), 48);

console.log('Pronto.');

/**
 * Gera os ícones e a marca do app a partir do traçado do logotipo.
 *
 * O logotipo é a palavra "strallo" desenhada à mão; as três primeiras paths
 * formam o "st", que serve de símbolo/ícone (ver PROJECT.md). Desenhar aqui,
 * em vez de exportar da canvas, mantém tudo em sincronia com o traço oficial.
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

/** O logotipo completo, path a path. */
const WORDMARK = [
  { d: 'M58 40 C49 33 33 35 33 46 C33 55 52 53 55 63 C57 72 42 75 30 68', width: 10 },
  { d: 'M70 24 C68 44 67 60 71 74 C73 80 79 79 83 75', width: 10 },
  { d: 'M54 43 C63 41 77 41 86 44', width: 8.5 },
  { d: 'M96 44 C95 55 95 64 97 74', width: 10 },
  { d: 'M96 49 C100 43 108 42 114 47', width: 9 },
  { d: 'M144 45 C143 55 143 64 146 74', width: 10 },
  { d: 'M144 50 C136 45 124 49 124 58 C124 67 135 71 145 66', width: 10 },
  { d: 'M156 24 C155 44 154 62 158 74 C160 80 166 79 170 75', width: 10 },
  { d: 'M180 24 C179 44 178 62 182 74 C184 80 190 79 194 75', width: 10 },
  {
    d: 'M213 44 C222 44 228 51 227 58 C226 66 219 71 211 70 C203 69 198 63 198 56 C199 49 205 44 213 44',
    width: 10,
  },
];

/** O símbolo é o começo do nome. */
const SYMBOL = WORDMARK.slice(0, 3);

const group = (paths) =>
  paths.map((p) => `<path d="${p.d}" stroke-width="${p.width}"/>`).join('');

const strokeAttrs = `fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round"`;

/**
 * Caixa que o traçado realmente ocupa. O viewBox nominal tem folga desigual e
 * a ponta arredondada ainda soma meia espessura de cada lado, então medir é o
 * que deixa o desenho opticamente centrado.
 */
function measure(paths) {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <g ${strokeAttrs}>${group(paths)}</g>
  </svg>`;

  const svg = new Resvg(probe);
  const box = svg.innerBBox() ?? svg.getBBox();
  if (!box) throw new Error('não foi possível medir o traçado');
  return box;
}

function write(name, svg, width) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();

  writeFileSync(join(ASSETS, name), png);
  console.log(`  ${name} (${(png.length / 1024).toFixed(1)} KB)`);
}

/** Desenho centrado numa tela quadrada — usado pelos ícones. */
function square(paths, canvas, target, background) {
  const box = measure(paths);
  const scale = target / Math.max(box.width, box.height);
  const tx = (canvas - box.width * scale) / 2 - box.x * scale;
  const ty = (canvas - box.height * scale) / 2 - box.y * scale;

  const fill = background
    ? `<rect width="${canvas}" height="${canvas}" fill="${background}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  ${fill}
  <g transform="translate(${tx} ${ty}) scale(${scale})" ${strokeAttrs}>${group(paths)}</g>
</svg>`;
}

/**
 * Desenho numa tela que acompanha a proporção dele — usado pela marca, que é
 * larga. `padding` é dado em relação à altura do traçado.
 */
function banner(paths, height, padding, background) {
  const box = measure(paths);
  const inner = height - padding * 2;
  const scale = inner / box.height;
  const width = Math.round(box.width * scale + padding * 2);

  const fill = background
    ? `<rect width="${width}" height="${height}" fill="${background}"/>`
    : '';

  const tx = padding - box.x * scale;
  const ty = padding - box.y * scale;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fill}
  <g transform="translate(${tx} ${ty}) scale(${scale})" ${strokeAttrs}>${group(paths)}</g>
</svg>`,
    width,
  };
}

mkdirSync(ASSETS, { recursive: true });
console.log('Gerando marca e ícones em assets/');

// Ícone do app: símbolo sobre o fundo da interface.
write('icon.png', square(SYMBOL, 1024, 600, BACKGROUND), 1024);

// Android não mostra o canvas inteiro do adaptive icon: recorta em
// círculo/squircle e exibe só a área central (72dp de 108dp, ~683px aqui),
// o que amplia o desenho. Por isso o símbolo vai bem menor que no ícone
// comum — 420px ocupam ~61% do que o launcher mostra. O fundo vem do
// `backgroundColor` no app.json.
write('adaptive-icon.png', square(SYMBOL, 1024, 420, null), 1024);

// Splash e web.
write('splash-icon.png', square(SYMBOL, 1024, 560, null), 1024);
write('favicon.png', square(SYMBOL, 48, 28, BACKGROUND), 48);

// Logotipo por extenso, para o README e materiais de apresentação.
const mark = banner(WORDMARK, 320, 72, BACKGROUND);
write('wordmark.png', mark.svg, mark.width);

const markPlain = banner(WORDMARK, 320, 24, null);
write('wordmark-transparent.png', markPlain.svg, markPlain.width);

console.log('Pronto.');

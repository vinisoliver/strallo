/**
 * Captura as telas da canvas de design como PNG, para o README.
 *
 * As artboards em `design/*.dc.html` são HTML comum dentro de uma tag do
 * editor, então renderizam num navegador normal. O script serve a pasta,
 * abre cada arquivo num Chromium headless e recorta o retângulo `.phone`.
 *
 * Usa o Chrome ou Edge já instalado — nada é baixado. Para apontar outro
 * binário, defina CHROME_PATH.
 *
 *   node scripts/generate-screens.mjs
 */

import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN = join(ROOT, 'design');
const OUT = join(ROOT, 'docs', 'screens');

/** Artboard -> nome do arquivo gerado. */
const SCREENS = [
  ['Main.dc.html', 'inicio.png'],
  ['EditCardTop.dc.html', 'editar.png'],
  ['EditCard.dc.html', 'editar-notas.png'],
  ['NoteEditor.dc.html', 'nova-nota.png'],
  ['NoteMenu.dc.html', 'nota-menu.png'],

  ['CollectionsHome.dc.html', 'inicio-categorias.png'],
  ['SelectMode.dc.html', 'multipla-selecao.png'],
  ['CreateCollection.dc.html', 'criar-categoria.png'],
  ['MoveToCollection.dc.html', 'mover-para.png'],
  ['InsideCollection.dc.html', 'dentro-da-colecao.png'],
  ['ConfirmDialog.dc.html', 'modal-descartar.png'],

  ['GameSelect.dc.html', 'jogo-inicio.png'],
  ['GameConfig.dc.html', 'jogo-configuracoes.png'],
  ['GameConfigCount.dc.html', 'jogo-configuracoes-2.png'],
  ['Playing.dc.html', 'jogo-jogando.png'],
  ['AnswerCorrect.dc.html', 'jogo-resposta-certa.png'],
  ['AnswerWrong.dc.html', 'jogo-resposta-errada.png'],
  ['Results.dc.html', 'jogo-resultado.png'],

  ['Account.dc.html', 'conta-sem-login.png'],
  ['AccountSynced.dc.html', 'conta-sincronizada.png'],
];

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findBrowser() {
  const found = CANDIDATES.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      'Nenhum Chrome ou Edge encontrado. Defina CHROME_PATH com o caminho do executável.',
    );
  }
  return found;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Servidor estático mínimo para a pasta de design. */
function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const file = join(DESIGN, decodeURIComponent(req.url.split('?')[0]));

      if (!file.startsWith(DESIGN) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404).end('not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      });
      createReadStream(file).pipe(res);
    });

    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port }),
    );
  });
}

const { server, port } = await serve();
const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});

mkdirSync(OUT, { recursive: true });
console.log('Capturando telas em docs/screens/');

try {
  const page = await browser.newPage();
  // deviceScaleFactor 2 entrega o dobro da resolução, para a imagem não
  // ficar borrada quando o README a exibe reduzida.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  for (const [artboard, output] of SCREENS) {
    if (!existsSync(join(DESIGN, artboard))) {
      console.log(`  (pulando ${artboard}: não encontrado)`);
      continue;
    }

    await page.goto(`http://127.0.0.1:${port}/${artboard}`, {
      waitUntil: 'networkidle0',
    });
    // As fontes vêm do Google Fonts; sem esperar, o texto sai no fallback.
    await page.evaluate(() => document.fonts.ready);

    const phone = await page.$('.phone');
    if (!phone) {
      console.log(`  (pulando ${artboard}: sem .phone)`);
      continue;
    }

    await phone.screenshot({ path: join(OUT, output) });
    console.log(`  ${output}`);
  }
} finally {
  await browser.close();
  server.close();
}

console.log('Pronto.');

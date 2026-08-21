# strallo — app de flashcards

App de flashcards com estilo inspirado no Duolingo (amigável, cantos
arredondados, botões "3D"), em **dark mode** com **amarelo** como cor
primária. Nome todo minúsculo: **strallo**.

## Canvas (protótipo visual)

Todo o design está numa canvas publicada (Claude Design dentro do
Claude Code), independente de qualquer pasta local:

**https://claude.ai/code/artifact/8648c843-1329-4688-ab83-773301ebdd0d**

Os arquivos-fonte da canvas estão em [`design/`](design/):
- `Main.dc.html` — tela inicial (grade de cards)
- `CardMenu.dc.html` — segurar 2s → menu editar/excluir
- `EditCard.dc.html` — editar/adicionar card (referência + significado)
- `GameSelect.dc.html` — escolher modo de jogo
- `GameConfig.dc.html` — configurar tempo/quantidade
- `Playing.dc.html` — jogando
- `Results.dc.html` — resultado
- `Logo.dc.html` — folha de marca
- `canvas.json` — layout/páginas da canvas
- `strallo-canvas.html` — a canvas já "seedada" (arquivo publicado)

Para **atualizar a canvas** numa nova sessão: invoque a skill `/design`,
edite os `.dc.html` em `design/`, re-seede e publique **passando a URL
acima** (`url`) para manter o mesmo link.

## Status

- **Fluxo Início — FINALIZADO** (design + código): tela inicial, seleção
  (menu do card) e edição/adição de card.
- **Fluxo Jogo — FINALIZADO** (design + código): escolher modo, configurar
  (tempo ou quantidade), jogar, ver a resposta e o resultado da rodada.
  **PRATICAR** na tela inicial abre o fluxo.

## Design system

**Cores (dark)**
- Fundo app: `#131f24`
- Superfície/card: `#1f2c33` · input/chip: `#1c2a31` · tile ícone: `#101b20`
- Borda: `#37464f` (borda inferior "3D" um pouco mais escura)
- Texto: `#f1f7fb` · secundário: `#7d929c` · fraco: `#556670`/`#46565f`
- **Primária (amarelo): `#ffc800`** · sombra do botão: `#c99a00` ·
  texto sobre amarelo: `#2b2317`
- Acentos funcionais: azul tempo `#4bc0f0`, verde acertos `#7ad13a`,
  vermelho erros `#ff6b6b`

**Tipografia**
- Corpo: **Nunito** (400/600/700/800)
- Display/títulos: **Baloo 2** (600/700/800)
- (Google Fonts)

**Componentes**
- Botão primário: fundo `#ffc800`, `box-shadow: 0 4px 0 #c99a00`, texto
  `#2b2317`, uppercase, `border-radius: 16px`, peso 800.
- Card: `#1f2c33`, borda `2px #37464f` com `border-bottom-width: 4px`
  (efeito 3D), raio 16–18px.
- Sem barras de rolagem visíveis (`scrollbar-width:none` +
  `::-webkit-scrollbar{display:none}`), rolagem por toque.

## Marca / logo

- **Logotipo**: a palavra **"strallo"** desenhada à mão (traço brush
  fino, `stroke-linecap/linejoin: round`), toda amarela `#ffc800`.
- **Símbolo/ícone**: apenas o **"st"** (começo do nome), mesmo traço.
- Versão **mono** para fundo claro: mesmo desenho em `#131f24`.

SVG do logotipo (viewBox `20 12 232 80`, stroke `#ffc800`, fill none,
linecap/linejoin round):

```html
<svg viewBox="20 12 232 80" fill="none" stroke="#ffc800"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M58 40 C49 33 33 35 33 46 C33 55 52 53 55 63 C57 72 42 75 30 68" stroke-width="10"/>
  <path d="M70 24 C68 44 67 60 71 74 C73 80 79 79 83 75" stroke-width="10"/>
  <path d="M54 43 C63 41 77 41 86 44" stroke-width="8.5"/>
  <path d="M96 44 C95 55 95 64 97 74" stroke-width="10"/>
  <path d="M96 49 C100 43 108 42 114 47" stroke-width="9"/>
  <path d="M144 45 C143 55 143 64 146 74" stroke-width="10"/>
  <path d="M144 50 C136 45 124 49 124 58 C124 67 135 71 145 66" stroke-width="10"/>
  <path d="M156 24 C155 44 154 62 158 74 C160 80 166 79 170 75" stroke-width="10"/>
  <path d="M180 24 C179 44 178 62 182 74 C184 80 190 79 194 75" stroke-width="10"/>
  <path d="M213 44 C222 44 228 51 227 58 C226 66 219 71 211 70 C203 69 198 63 198 56 C199 49 205 44 213 44" stroke-width="10"/>
</svg>
```

O **"st"** (símbolo/ícone) são apenas as 3 primeiras paths (viewBox
`16 10 82 82`).

## Telas e comportamentos definidos

**Início (`Main`)**
- Cabeçalho: logotipo strallo à esquerda + **contagem de flashcards**
  à direita (ícone de pilha + número).
- Busca no topo.
- Grade 2×N; o **"+"** ocupa o primeiro card (adicionar).
- Cada card mostra só a **referência**. A **letra** aparece só no
  **primeiro card de cada grupo** de letra (ex.: se há Abandon/Ability/
  Absent, só "Abandon" mostra o "A").
- **Rail de alfabeto** à direita, maior/tocável, com **indicador da
  letra atual** (balão amarelo) — clicar/rolar pula pra letra.
- Navbar inferior: **Jogar** (amarelo) + **Ajuda**.

**Menu do card (`CardMenu`)** — segurar um card por **2s** abre um
dropdown (visual de caixa de seleção só daquele card) com **Editar**
(lápis branco) e **Excluir** (vermelho); resto esmaecido.

**Editar/Adicionar (`EditCard`)** — editar **referência** e
**significado**. A IA aceita respostas **aproximadas** do significado.

**Jogo** — escolher modo (**por tempo** / **por quantidade**); o modo
escolhido sobe e escurece; configurar (tempo de 5 em 5s, quantidade de
1 em 1); jogar digitando o significado (contador + tempo); resultado
("Muito bem!", caixas de tempo e acertos/erros, recomeçar +
engrenagem).

## Código

**Stack**: Expo (SDK 57) + React Native + TypeScript, `expo-router` para
navegação, `expo-sqlite` para armazenamento local e `react-native-svg`
para a marca e os ícones. Gerenciador de pacotes: **yarn**.

```bash
yarn start
```

**Gerar o APK** (build na nuvem, perfil `preview` do [`eas.json`](eas.json)):

```bash
npx --yes --package eas-cli eas build --platform android --profile preview
```

O `--package` é necessário porque o binário do pacote `eas-cli` se chama
`eas` — sem ele o npx falha com "could not determine executable to run".

**Ícones**: `yarn icons` redesenha `assets/` a partir das paths da marca
(ver [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)).

Estrutura:

- `app/_layout.tsx` — fontes (Nunito / Baloo 2), `SQLiteProvider`, Stack.
- `app/index.tsx` — tela inicial: grade, busca, rail alfabético, menu de
  seleção e navbar.
- `app/card/[id].tsx` — adicionar (`/card/new`) e editar (`/card/<id>`).
- `app/practice/` — o fluxo de prática: `index` (escolher modo), `config`
  (tempo ou quantidade), `play` (a rodada) e `results`.
- `src/game/` — regras da rodada: `types.ts` (modos, limites, durações das
  animações) e `answer.ts` (o que conta como resposta certa).
- `src/theme.ts` — tokens do design (cores, raios, medidas). **Fonte da
  verdade do visual no código** — mudou a canvas, muda aqui primeiro.
- `src/db/` — migrações (`index.ts`) e CRUD (`cards.ts`).
- `src/utils/text.ts` — normalização (sem acento/minúsculas) e a letra de
  agrupamento; `sort_key` no banco guarda a forma normalizada.
- `src/utils/grid.ts` — monta a grade, decide qual cartão exibe a letra e
  resolve para onde o rail rola.
- `src/components/` — componentes da UI.

**Regras da rodada**

- Modo por tempo: o relógio corre e a barra do topo enche sozinha até zerar;
  ela pausa enquanto a resposta está na tela, para ler não custar segundos.
  O baralho reinicia se acabar antes do tempo.
- Modo por quantidade: a barra acompanha os cartões respondidos e a rodada
  acaba quando o baralho termina.
- Só entram cartões com significado preenchido.
- A resposta é aceita ignorando acentos, maiúsculas e pontuação, e basta a
  primeira parte do significado (antes de `—`, `,`, `;` ou `/`).

O que ainda **não** existe: a verificação de significado por IA (o design
prevê respostas de fato aproximadas — hoje a regra é local, em
`src/game/answer.ts`) e qualquer backend.

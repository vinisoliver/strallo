# strallo — app de flashcards

App de flashcards com estilo inspirado no Duolingo (amigável, cantos
arredondados, botões "3D"), em **dark mode** com **amarelo** como cor
primária. Nome todo minúsculo: **strallo** (o app se apresenta como
"Strallo" no launcher).

---

## Onde o projeto está

| Parte | Design | Código |
| --- | --- | --- |
| **Fluxo Início** — grade, busca, rail alfabético, criar/editar/excluir | pronto | pronto |
| **Fluxo Jogo** — escolher modo, configurar, jogar, resposta, resultado | pronto | pronto |
| **Coleções** — agrupar cartões em pastas | pronto (canvas) | **não começou** |

**O próximo passo é implementar coleções em código.** Todo o design já
está desenhado e as decisões estão registradas mais abaixo.

---

## Canvas (protótipo visual)

**https://claude.ai/code/artifact/8648c843-1329-4688-ab83-773301ebdd0d**

A canvas é a **fonte da verdade do design** — o Vinícius edita direto
nela. Os `.dc.html` em [`design/`](design/) são cópias que podem estar
atrasadas.

**Antes de mexer na canvas, puxe a versão publicada** (senão o publish é
recusado por conflito e você arrisca sobrescrever o trabalho dele):

1. `WebFetch` na URL acima — o resultado informa onde o HTML foi salvo.
2. `node "<skill>/seed-canvas.mjs" --extract "<html salvo>" --to <pasta nova>`
3. Compare com `design/` e copie por cima; edite; re-seede; publique com
   `contract: "0.1.31"` e **sem** `capabilities`.

A skill é `/design` (o `<skill>` acima é o diretório-base dela).

### Artboards

**Marca** — `Logo.dc.html`

**Fluxo Início** — `Main` (grade) · `CardMenu` (segurar) · `EditCard`

**Fluxo Jogo** — `GameSelect` · `GameConfig` (tempo) ·
`GameConfigCount` (quantidade) · `Playing` · `AnswerCorrect` ·
`AnswerWrong` · `Results` · `ConfirmDialog` (padrão de confirmação)

**Fluxo Coleções** — `CollectionsHome` · `SelectMode` ·
`CreateCollection` · `MoveToCollection` (4a) ·
`MoveToCollectionV1` (4b) · `InsideCollection`

> **Decisão pendente:** as artboards 4a e 4b são **duas propostas para a
> mesma tela** de mover, deixadas lado a lado para comparação. 4a navega
> por níveis com o caminho abaixo da busca; 4b mostra a árvore inteira
> com recuo. O Vinícius ainda não escolheu — pergunte antes de codar.

---

## Código

**Stack**: Expo (SDK 57) + React Native + TypeScript, `expo-router`,
`expo-sqlite`, `react-native-svg`. Gerenciador de pacotes: **yarn**.

```bash
yarn start
```

**APK** (build na nuvem, perfil `preview` do [`eas.json`](eas.json)):

```bash
npx --yes --package eas-cli eas build --platform android --profile preview
```

O `--package` é necessário porque o binário do pacote `eas-cli` se chama
`eas`; sem ele o npx falha com "could not determine executable to run".

Outros: `yarn typecheck` · `yarn icons` (redesenha `assets/` a partir das
paths da marca) · `node scripts/generate-screens.mjs` (captura as
artboards como PNG — **ver Pendências**).

### Estrutura

```
app/
  _layout.tsx          fontes, SQLiteProvider, Stack
  index.tsx            tela inicial
  card/[id].tsx        adicionar (/card/new) e editar (/card/<id>)
  practice/
    index.tsx          escolher modo
    config.tsx         configurar tempo ou quantidade
    play.tsx           a rodada
    results.tsx        resultado
src/
  theme.ts             tokens do design (cores, raios, medidas)
  db/index.ts          migrações versionadas por user_version
  db/cards.ts          CRUD e consultas
  game/types.ts        modos, limites, durações das animações
  game/answer.ts       o que conta como resposta certa
  components/          componentes de interface
  utils/text.ts        normalização (sem acento/minúsculas)
  utils/grid.ts        monta a grade e resolve o rail alfabético
design/                artboards da canvas
scripts/               geração de ícones e capturas
```

`src/theme.ts` é a **fonte da verdade do visual no código**. Mudou a
canvas, muda ali primeiro.

---

## Regras de negócio (implementadas)

**Cartões**
- Referência e significado são **ambos obrigatórios** — o botão Salvar e
  o "OK" do teclado seguem a mesma regra.
- `sort_key` e `meaning_key` guardam o texto normalizado (sem acento, em
  minúsculas). O `lower()` do SQLite não remove acentos, por isso as
  colunas existem.
- Voltar com alterações não salvas pede confirmação.

**Grade**
- Ordem alfabética por `sort_key`. Referências que não começam com A–Z
  caem no grupo `#`.
- A letra aparece só em quem **inicia uma sequência** dela (comparação
  com o cartão anterior, não com o que já apareceu antes).
- Todos os cartões têm largura fixa (metade da linha), inclusive o "+",
  para um cartão sozinho na última linha não esticar.
- O rail alfabético substitui a barra de rolagem: toque e arraste levam
  a grade até a letra.

**Busca**
- Procura na referência **e** no significado, ignorando acentos.
- Quem casa por referência vem primeiro; depois os encontrados só pelo
  significado. Cada bloco em ordem alfabética.

**Jogo**
- Só entram cartões com significado preenchido.
- **Por tempo**: a barra do topo corre sozinha até zerar. O relógio e a
  barra **pausam** enquanto a resposta está na tela — ler não custa
  segundos. O baralho reinicia se acabar antes do tempo.
- **Por quantidade**: a barra acompanha os cartões respondidos; a rodada
  acaba quando o baralho termina.
- A resposta é aceita ignorando acentos, maiúsculas e pontuação, e basta
  a **primeira parte** do significado (antes de `—`, `,`, `;` ou `/`) —
  ver `src/game/answer.ts`. Isto é um substituto local: a verificação por
  IA que o design prevê **não existe ainda**.
- O texto do resultado muda com o desempenho ("Muito bem!" só acima de
  80% de acerto).

**Interface**
- O botão principal (`PrimaryButton`) tem `flex: 1` porque quase sempre
  divide a linha com outro botão. **Sozinho numa coluna ele precisa de
  uma `View` com `flexDirection: 'row'` em volta**, senão disputa altura
  e aparece espremido.
- Confirmações destrutivas usam `ConfirmDialog` (visual do app, botão
  vermelho), não `Alert` nativo.

---

## Coleções — o que implementar

Design pronto na canvas; **nada em código ainda**.

### Comportamento acordado

**Seleção múltipla** (substitui o menu de um cartão só)
- Segurar um cartão liga o modo seleção.
- O fundo **não escurece**; todos os itens ganham caixa de seleção vazia,
  prontos para toque.
- O **rail alfabético continua funcionando** durante a seleção.
- Barra fixa embaixo com: **Agrupar**, **Mover**, **Editar**, **Excluir**.
  - **Agrupar** só aparece com **2 ou mais** selecionados.
  - **Editar** só com **exatamente 1** (com 2+ fica desabilitado).
- Coleções também podem ser selecionadas.

**Criar coleção** — modal com nome e **10 cores predefinidas** em
quadradinhos (grade 5×2); a escolhida ganha anel branco.

Cores: `#ffc800` `#ff9f45` `#ff6b6b` `#ff7eb6` `#c084fc` `#8b9dff`
`#4bc0f0` `#3fd9c0` `#7ad13a` `#c3e04a`

**Mover** — modal listando as coleções, com botão para criar uma nova
(abre o modal de criação e **volta** para a lista). Ver a decisão
pendente entre 4a e 4b.

**Toast** — depois de mover, aparece embaixo: "3 itens movidos para
**Verbos**", com "Desfazer".

**Home e navegação**
- Coleções aparecem **na mesma grade** dos cartões e seguem a **mesma
  ordem alfabética**, com ícone de pasta na cor escolhida.
- Card de coleção: mesmo cartão dos demais (`#1f2c33`, borda `#37464f`),
  com a cor só no **ícone do canto superior direito** e na **borda
  inferior**. Contador em 10px ("12 coleções, 88 cartões").
- **Coleções dentro de coleções** são permitidas (árvore).
- Entrar numa coleção **troca o conteúdo da mesma tela** e mostra o
  caminho ("Início › Verbos") — não é uma rota nova.
- Dentro de uma coleção, **Praticar usa só os cartões dela** (incluindo
  os das subcoleções).

### O que ainda não foi decidido

- Qual das duas telas de mover (4a ou 4b).
- Modelo de dados: sugestão é uma tabela `collections` com
  `parent_id` (árvore) e `collection_id` em `cards`, mas nada foi
  combinado com o Vinícius.
- O que acontece ao excluir uma coleção com conteúdo dentro.

---

## Design system

**Cores (dark)**
- Fundo app: `#131f24` · Superfície/card: `#1f2c33` · input/chip: `#1c2a31`
- Borda: `#37464f` (a inferior mais escura, dando o relevo "3D")
- Texto: `#f1f7fb` · secundário: `#7d929c` · fraco: `#556670`/`#46565f`
- **Primária (amarelo): `#ffc800`** · sombra do botão: `#c99a00` ·
  texto sobre amarelo: `#2b2317`
- Desabilitado: fundo `#2a3840`, texto `#556670`
- Jogo: tempo `#4bc0f0` · quantidade `#c084fc` · acerto `#7ad13a` ·
  erro `#ff6b6b`

**Tipografia** — corpo **Nunito** (400/600/700/800), display **Baloo 2**
(800). Via `@expo-google-fonts`.

**Componentes**
- Botão primário: `#ffc800`, borda inferior de 4px em `#c99a00`, texto
  `#2b2317`, uppercase, raio 16, peso 800. Ao pressionar, desce os 4px.
- Card: `#1f2c33`, borda `2px #37464f` com a inferior de 4px, raio 18.
- Sem barras de rolagem visíveis.

---

## Marca

- **Logotipo**: a palavra "strallo" desenhada à mão (traço brush,
  linecap/linejoin round), amarela `#ffc800`.
- **Símbolo/ícone**: apenas o **"st"** — as 3 primeiras paths.
- Os ícones do app são **gerados** dessas paths por
  [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs) (`yarn icons`),
  então marca e app nunca saem de sincronia. O adaptive icon do Android
  usa o símbolo menor (420px de 1024) porque o launcher recorta e amplia.

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

---

## Pendências e armadilhas conhecidas

**Não commitado** (último commit: `5d27793`)
- `src/components/ConfirmDialog.tsx` e o uso dele em
  `app/practice/play.tsx` e `app/card/[id].tsx`.
- Todo o design de coleções em `design/`.

**As capturas de tela pararam de funcionar.** `generate-screens.mjs` usa
o Edge em headless; num certo ponto o Edge parou de responder neste
ambiente (nem fora do puppeteer ele devolve DOM). As últimas artboards
foram publicadas **sem conferência visual**. Se precisar de prévias,
investigue o Edge ou troque por outro navegador.

**`Alert` nativo ainda em três lugares** — excluir cartão (na home e na
edição) e "Não deu para salvar". São candidatos ao `ConfirmDialog`, mas
o Vinícius não pediu a troca.

**O gesto de voltar** (deslizar da borda / botão do Android) na tela de
edição **não** dispara a confirmação de descarte — o guarda está só no
chevron.

**Heredoc do bash quebra** com o HTML das artboards; use a ferramenta de
escrita de arquivo para elas.

**Rotas tipadas**: ao criar uma rota nova, os tipos em `.expo/types` só
são gerados quando o Metro roda. Se o `tsc` reclamar de uma rota que
existe, suba `npx expo start` por alguns segundos e rode de novo.

---

## Como o Vinícius trabalha

- Prefere **yarn**.
- Edita a canvas direto e espera que o código acompanhe — quando ele diz
  que algo "está desatualizado", puxe a canvas antes de comparar.
- Pede iterações visuais curtas: propõe, olha, ajusta. Quando não gosta,
  costuma pedir outra abordagem em vez de um ajuste fino.

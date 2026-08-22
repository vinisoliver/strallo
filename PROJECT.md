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
| **Coleções** — agrupar cartões em pastas | pronto | pronto |
| **Conta e nuvem** — login Google, sincronização | pronto | pronto, **sem credenciais** |
| **Notas** — até 6 linhas curtas presas ao cartão | pronto | pronto |

Os quatro fluxos estão em pé. A nuvem só entra em operação quando o `.env`
tiver as três variáveis — ver **Nuvem** abaixo. Sem elas o app roda igual,
offline, e a tela de Conta diz que a sincronização não foi configurada.

O que falta do README (compartilhar coleções, imagem, IA, voz, frases) ainda
não tem design nem código.

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

**Fluxo Início** — `Main` (grade) · `EditCardTop` (topo do formulário) ·
`EditCard` (coleção e notas) · `NoteEditor` (modal) · `NoteMenu` (menu e
arraste)

**Fluxo Jogo** — `GameSelect` · `GameConfig` (tempo) ·
`GameConfigCount` (quantidade) · `Playing` · `AnswerCorrect` ·
`AnswerWrong` · `Results` · `ConfirmDialog` (padrão de confirmação)

**Fluxo Coleções** — `CollectionsHome` · `SelectMode` ·
`CreateCollection` · `MoveToCollection` · `InsideCollection`

> A tela de mover foi decidida: **navegação por níveis**, com o caminho
> logo abaixo do topo da folha e as linhas sem recuo. A proposta
> alternativa (árvore com recuo) foi descartada.
> `CardMenu` também saiu: o menu de um cartão só foi substituído pela
> seleção múltipla.

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
  index.tsx            tela inicial — grade, coleções, seleção múltipla
  card/[id].tsx        adicionar (/card/new) e editar (/card/<id>)
  account.tsx          conta: sem login, ou com sessão e números
  practice/
    index.tsx          escolher modo
    config.tsx         configurar tempo ou quantidade
    play.tsx           a rodada
    results.tsx        resultado
src/
  theme.ts             tokens do design (cores, raios, medidas)
  db/index.ts          migrações versionadas por user_version
  db/cards.ts          CRUD de cartões, repetidas e sorteio do baralho
  db/collections.ts    CRUD da árvore, mover, excluir em cascata
  db/library.ts        a listagem única de coleções + cartões da grade
  db/notes.ts          as notas do cartão, gravadas em lote
  db/sessions.ts       rodadas concluídas (o número "práticas")
  db/account.ts        os três totais da tela de Conta
  cloud/config.ts      credenciais do ambiente e o `cloudConfigured`
  cloud/client.ts      o client do Supabase, ou null sem credenciais
  cloud/auth.ts        Google -> idToken -> sessão do Supabase
  cloud/sync.ts        sobe o que mudou aqui, desce o que mudou lá
  cloud/changes.ts     aviso de escrita local, disparado pelo próprio db/
  cloud/CloudProvider.tsx  sessão, estado da sincronização, debounce
  game/types.ts        modos, limites, durações das animações
  game/answer.ts       o que conta como resposta certa
  hooks/useLibrary.ts  carrega um nível da árvore + a árvore inteira
  hooks/useCollectionTree.ts  só a árvore, para a tela de edição
  components/          componentes de interface
  utils/text.ts        `normalize` (sem acento) e `foldCase` (com acento)
  utils/grid.ts        monta a grade e resolve o rail alfabético
  utils/collections.ts contagens da subárvore, caminho, guarda de ciclo
  utils/notes.ts       sublinhado e realce da referência nas notas
  utils/breadcrumb.ts  o que cabe do caminho da árvore
design/                artboards da canvas
supabase/schema.sql    o que rodar no SQL Editor do Supabase
scripts/               geração de ícones e capturas
```

Uma coleção aberta **não é uma rota**: `app/index.tsx` guarda em qual
coleção está e troca o conteúdo da própria tela. Por isso o voltar do
Android é interceptado ali — ele sai da seleção, depois sobe um nível, e
só então deixa o sistema fechar o app.

Duas coisas nessa tela existem por causa de como ela *parecia* funcionar,
e é fácil desfazê-las sem perceber:

- **`requestedId` e `collectionId` são diferentes.** O primeiro é o nível
  pedido pelo toque; o segundo, o nível a que os dados na tela pertencem,
  e vem de `useLibrary`. O cabeçalho lê o **segundo**. Se ler o primeiro,
  o caminho troca no quadro do toque e a grade só troca quando a consulta
  volta — o cabeçalho já diz "Verbos" com os cartões do Início na tela.
- **`GridTile` é `memo`, e as funções de toque nascem fora dele.** Marcar
  um item redesenhava todos os visíveis, cada pasta com o seu SVG, e o
  toque seguinte só era atendido depois — o atraso entre cliques na
  seleção múltipla. Trocar `onPress={handleEntryPress}` por
  `onPress={() => toggle(id)}` traz o atraso de volta, porque a prop
  passa a ser nova a cada renderização. `AlphabetRail` é `memo` pelo
  mesmo motivo.

`src/theme.ts` é a **fonte da verdade do visual no código**. Mudou a
canvas, muda ali primeiro.

---

## Regras de negócio (implementadas)

**Cartões**
- Referência e significado são **ambos obrigatórios** — o botão Salvar e
  o "OK" do teclado seguem a mesma regra.
- **Referência não se repete**, no app inteiro. A comparação ignora caixa
  e espaços nas pontas, mas **respeita o acento**: "café" e "cafe" são
  dois cartões, e os dois podem existir (decisão do Vinícius). Quem
  compara é a coluna `reference_key` (migração 4), porque o `lower()` do
  SQLite só mexe em A–Z. O aviso aparece enquanto se digita, e
  `handleSave` refaz a consulta antes de gravar — digitar depressa e
  tocar em Salvar passaria pelo aviso, que é assíncrono.
- O cartão escolhe **em qual coleção fica**, na própria tela de edição,
  pela mesma folha do "Mover para". Vale para novo e para existente; num
  cartão novo aberto de dentro de uma coleção, ela já vem escolhida.
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

## Coleções — como ficou

Implementado a partir das artboards `CollectionsHome`, `SelectMode`,
`CreateCollection`, `MoveToCollection` e `InsideCollection`.

### Modelo de dados (migração 3)

Tabela `collections` com `parent_id` (árvore) e coluna `collection_id`
em `cards`. **`NULL` é o Início** nas duas tabelas — "estar na raiz" tem
a mesma representação para pasta e para cartão, e é o que deixa as
consultas compararem tudo com o mesmo `IS`.

Não há `FOREIGN KEY`: o `PRAGMA foreign_keys` do SQLite vem desligado, e
a integridade dependeria de um pragma fácil de esquecer. Quem apaga a
subárvore é `deleteCollections`.

Percorrer a árvore é sempre a mesma CTE, `SUBTREE_CTE` em
`src/db/collections.ts`, que recebe a raiz e devolve ela e tudo abaixo.
Duas armadilhas dela, já resolvidas no código:

- o filtro é `EXISTS (SELECT 1 FROM tree WHERE tree.id IS x)`, **nunca**
  `x IN (SELECT id FROM tree)` — a raiz entra como `NULL`, e no SQLite
  `NULL IN (NULL, 1)` não é verdadeiro, então o Início sumiria;
- a recursão usa vírgula (`FROM collections c, tree t`), não `JOIN`.

### Comportamento

**Seleção múltipla** (substituiu o menu de um cartão só)
- Segurar um item liga o modo, já marcando o que estava sob o dedo.
- O fundo **não escurece**; todos os itens ganham caixa vazia.
- O **rail alfabético continua funcionando** durante a seleção.
- Barra fixa embaixo: **Agrupar** (só com 2+), **Mover**, **Editar** (só
  com exatamente 1; com 2+ fica apagada), **Excluir**.
- Sair é só pelo X — desmarcar o último item **não** encerra o modo.

**Criar / editar / agrupar** — o mesmo modal nos três casos, só mudam
título e botão. Nome e **10 cores fixas** em grade 5×2; a escolhida ganha
anel branco.

Cores: `#ffc800` `#ff9f45` `#ff6b6b` `#ff7eb6` `#c084fc` `#8b9dff`
`#4bc0f0` `#3fd9c0` `#7ad13a` `#c3e04a`

**Mover** — `CollectionPicker`: folha com as coleções de um nível por
vez, sem recuo, e o caminho logo abaixo do topo (é por ele que se volta).
O botão confirma o nível que o caminho aponta, Início inclusive. A folha
**esconde as coleções sendo movidas e o que está dentro delas** (prop
`excludeIds`) — sem isso daria para pôr uma coleção dentro de si mesma e
arrancar o galho da árvore. `applyMove` repete a checagem, como rede.

O mesmo componente serve a tela de edição de cartão, onde só mudam o
título, o subtítulo e o rótulo do botão — e `excludeIds` fica vazio,
porque escolher onde um cartão mora não tem como criar ciclo.

**Toast** — depois de mover: "3 itens movidos para **Verbos**", com
"Desfazer" que devolve **cada item ao lugar de onde saiu** (o snapshot
guarda o pai de cada um, então uma seleção vinda de pastas diferentes
volta certa). Some sozinho em 4,2s.

**Home e navegação**
- Coleções entram **na mesma grade** e na **mesma ordem alfabética** dos
  cartões, com ícone de pasta na cor escolhida.
- Card de coleção: o mesmo cartão dos demais, com a cor só no ícone do
  canto e na borda inferior. Contador em 10px, somando a **subárvore
  inteira** ("12 coleções, 88 cartões"); vazia mostra "Vazia".
- Coleções dentro de coleções são permitidas.
- Entrar numa coleção **troca o conteúdo da mesma tela** — não é rota
  nova. Ver a nota na Estrutura sobre o voltar do Android.
- Dentro de uma coleção, **Praticar usa só os cartões dela e das
  subcoleções**, e a coleção viaja como parâmetro até o "Recomeçar" da
  tela de resultado.

**Busca dentro de coleção** — procura na **subárvore**, não só no nível
aberto. É o que a tela promete ("Buscar nesta coleção") e evita um cartão
sumir da busca por ter sido guardado numa pasta; no Início, onde a
subárvore é o app todo, o comportamento é o de sempre. A ordem segue a
regra dos cartões, com as coleções no primeiro bloco (o dos nomes).

**Excluir uma coleção leva o conteúdo junto**, em qualquer profundidade —
decisão do Vinícius, em 21/08/2026. Nada sobe para o nível de cima. Por
isso a confirmação diz quantos cartões vão embora (`describeDeletion`).

## Nuvem — como ficou

O armazenamento continua sendo **local**. A nuvem é uma cópia que se
reconcilia, não o lugar onde os cartões moram: tirar a internet não muda nada
no uso do app. Essa foi a decisão que orientou o resto.

### Por que Postgres (Supabase), e não um banco de documentos

Os dados **já eram relacionais e já eram SQLite** — `cards.collection_id`,
`collections.parent_id`, a CTE recursiva que percorre a subárvore. Um esquema
relacional na nuvem é quase uma cópia do local, e sincronizar vira mapear
linha com linha. Um banco de documentos exigiria um segundo modelo, diferente
do que já existe, e tradução nos dois sentidos.

O que costuma justificar NoSQL — documentos desnormalizados, escala
horizontal — não vale aqui: uma biblioteca pessoal são alguns milhares de
linhas, todas de um dono só. Supabase especificamente pelo login Google
pronto e pela Row Level Security.

### O que a sincronização exigiu do esquema local (migração 5)

Três mudanças que **não dava para adiar**, porque mexem em tabela com dado
dentro:

**`uuid` em toda linha.** O autoincrement é único neste banco, não entre
bancos: dois aparelhos offline criam, os dois, o `id = 7`. O `id` INTEGER
continua mandando dentro do app — nenhuma tela mudou por causa disso —, e o
uuid só existe na fronteira com a nuvem. A tradução acontece num `LEFT JOIN`
na subida e num subselect por uuid na descida.

**`deleted_at` no lugar da exclusão.** Apagar de verdade não se propaga: o
aparelho A apaga, o B ainda tem a linha, e no próximo sync o B **devolve** o
que o A excluiu. Agora `deleteCard`, `deleteCards` e `deleteCollections`
marcam, e toda consulta do app filtra `deleted_at IS NULL`.

**`practice_sessions`.** Uma linha por rodada concluída, e não um contador:
contador não se sincroniza — dois aparelhos com 20 cada não viram 40 nem 20, e
não há como saber. Lista de rodadas se junta sozinha.

### Como o sync funciona

`syncNow` sobe e depois desce, sempre **coleções antes de cartões** nas duas
direções: um cartão aponta para a pasta onde mora, e a pasta precisa existir
dos dois lados antes disso.

O árbitro de conflito é `updated_at`, e vence a escrita mais recente. Para um
acervo pessoal em poucos aparelhos basta; o caso que sobra (editar o mesmo
cartão nos dois, offline, ao mesmo tempo) perde uma das edições.

Duas sutilezas que já custaram raciocínio:

- Na descida, as coleções entram em **duas passadas** — primeiro sem o pai,
  depois com. Uma subcoleção pode chegar antes da pasta que a contém, e
  apontar para uma linha inexistente deixaria a árvore quebrada.
- A marca d'água da leitura acompanha o `updated_at` **das linhas que
  vieram**, não o relógio do aparelho. Dois celulares com horas diferentes
  fariam a marca pular para o futuro e esconder alterações legítimas.

### O que dispara uma sincronização

As funções de escrita do `db/` chamam `notifyLocalChange()` — não as telas.
Assim qualquer caminho que crie, edite ou exclua passa por ali, e uma tela
nova nasce sincronizando. O `CloudProvider` escuta, espera 2,5 s para juntar
mudanças seguidas, e sobe uma vez. Também sincroniza ao abrir o app, ao
voltar do segundo plano e logo depois do login.

### Credenciais

Três variáveis no `.env` (modelo em `.env.example`). Sem elas
`cloudConfigured` é falso, `getClient()` devolve `null` e a tela de Conta
mostra o aviso em vez do botão do Google.

`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` é o client **Web**, não o Android: é a
audiência que o Supabase valida no `signInWithIdToken`. Com o id do Android o
login passa no aparelho e falha no servidor, com um erro que não diz isso.

O login nativo do Google **não funciona no Expo Go** — precisa de um build
próprio. E o Android exige que a SHA-1 do keystore usado na build esteja
registrada num client OAuth de Android no Google Cloud; a da EAS sai de
`npx --yes --package eas-cli eas credentials`.

---

## Notas — como ficou

Seis linhas de até 120 caracteres presas ao cartão, reordenáveis. O nome
saiu de uma decisão do Vinícius: o app guarda repertório de inglês **e**
qualquer outra coisa, então precisava de um substantivo contável que
cobrisse tanto uma frase de exemplo quanto um dado seco. "Frases" e
"Exemplos" excluem o dado; "Fatos" exclui a frase.

### O que acende sozinho

Dois realces, em cores diferentes: a **referência** no amarelo da marca, e
o **significado** no verde de resposta certa do jogo. O verde não é
enfeite — no jogo o significado *é* a resposta, e ver a mesma cor nos dois
lugares liga as telas sem legenda.

Do significado, o que acende são os pedaços que o jogo aceitaria como
resposta: "Coragem — a capacidade de enfrentar o medo" acende em
"Coragem", porque a frase inteira jamais apareceria dentro de uma nota. A
quebra usa os mesmos separadores de `game/answer.ts`.

Onde os dois caem no mesmo lugar, a referência ganha — é o que se está
aprendendo.

### Onde o sublinhado mora

`notes.marks` guarda pares `[início, fim)` em JSON, e **não** marcação
dentro do texto. Assim `text` continua sendo exatamente o que a pessoa
escreveu, e segue servindo para busca e para o futuro modo de jogo sem
precisar ser desembrulhado antes.

A referência do cartão **não** é guardada como marcação: onde ela acende
é resolvido na hora de desenhar, por `buildSegments`. Renomear o cartão
reacende todas as notas sozinho, sem reescrever nada no banco.

As duas formatações se cruzam — dá para sublinhar um trecho que contém a
referência —, então os limites dos dois conjuntos entram no mesmo corte em
vez de um ser aplicado depois do outro.

A busca da referência ignora caixa mas **respeita acento**, a mesma regra
que decide cartão repetido, e só casa palavra inteira: sem isso "arte"
acenderia dentro de "quarteirão".

### Quando as notas são gravadas

Junto com o cartão, no Salvar — nunca no momento em que o bloco é escrito.
Um cartão novo só tem `id` depois de criado, e descartar as alterações
precisa descartar as notas junto. A reconciliação em `saveNotes` é por
`uuid`, não por posição, para reordenar não confundir uma nota com outra.

### Duas armadilhas do arraste

**Um `PanResponder` por posição**, e não um só: ele precisa saber qual
bloco o dedo pegou. Espalhar `panHandlers` e declarar
`onStartShouldSetResponder` na mesma `View` **não funciona** — a segunda
sobrescreve a que veio no espalhamento, e o arraste nunca começa.

**Os callbacks leem props por ref.** Criados uma vez, chamariam para sempre
a versão da primeira renderização.

### Formatação dentro do campo

O `TextInput` aceita `Text` aninhados como **filhos**, e é assim que o
sublinhado e os realces aparecem enquanto se digita, como a artboard
mostra. O preço está numa invariante do React Native: `value` e filhos não
podem coexistir (`TextInput.js`, "Cannot specify both value and
children"). Os filhos passam a ser o conteúdo; quem guarda o texto é o
estado do componente, e a cada tecla os filhos são refeitos.

Isto **nunca rodou num aparelho**. A técnica é a mesma que apps de chat
usam para destacar menções, mas re-render de filhos a cada tecla tem
histórico de pular o cursor no Android. Se isso aparecer, o recuo é voltar
ao campo cru com uma prévia abaixo — foi assim na primeira versão.

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

**`try/catch` não protege de um módulo nativo ausente.** O Metro, em
`guardedLoadModule`, **captura** a exceção de um módulo que estoura ao ser
avaliado e a entrega ao `ErrorUtils.reportFatalError` em vez de relançá-la:
a promessa do `import()` resolve como se nada tivesse acontecido, e o erro
aparece na tela vermelha longe de qualquer `catch`. A única defesa é o
módulo nunca chegar a ser avaliado — em `cloud/auth.ts` isso é
`TurboModuleRegistry.get('RNGoogleSignin')`, que devolve `null` em vez de
estourar, consultado **antes** do import. Vale para qualquer módulo nativo
que o app carregue sob demanda.

**Texto centralizado alcança o canto do cartão.** O cartão é uma coluna
com `alignItems: 'center'`, e nesse arranjo duas coisas surpreendem. A
primeira: o filho é medido pela largura **natural** dele, não pela do pai,
então um nome comprido transbordava a borda e o `numberOfLines` não
cortava nada — não havia limite para estourar. A segunda: como o conteúdo
é centralizado, ele cresce **para cima** também, e alcança a letra, o
ícone da pasta ou a caixa de seleção, todos posicionados em cima. Por
isso `CardTile` prende a largura com `alignSelf: 'stretch'`, fixa
`lineHeight` (para a conta ser previsível) e limita as linhas: a pasta
tem uma só, e o cartão cai para uma no modo de seleção. A aritmética está
comentada no estilo `folder`.

**O caminho da árvore encolhe pelo meio, e depende de medição.**
`planCrumbs` em `utils/breadcrumb.ts` decide o que cabe; o componente
mede os nomes numa linha invisível de 10000px porque estimar largura por
número de letras erra muito numa fonte de largura variável. Enquanto
faltar medida ele **não desenha nada** — um quadro em branco é melhor que
um salto. Se um dia as larguras vierem zeradas, o plano conclui que tudo
cabe e o comportamento volta a ser o antigo, sem quebrar.

**Não há testes automatizados.** As consultas recursivas e a aritmética
da árvore foram conferidas rodando o SQL num SQLite de verdade (via
`python -c`, com o mesmo schema das migrações) e transpilando
`utils/collections.ts` para rodar no node. Vale repetir isso ao mexer
nelas — `tsc` não pega `NULL IN (...)`.

**Nunca foi visto rodando.** O código empacota (`npx expo export
--platform android` passa) e o `tsc` está limpo, mas as telas de coleção
não foram abertas num aparelho nem num emulador. Três coisas que só o uso
revela: o modal de criar coleção **abre por cima da folha de escolher**
(dois `Modal` do RN ao mesmo tempo, em duas telas diferentes), a barra de
seleção precisa caber com quatro ações em telas estreitas, e a fluidez da
seleção múltipla — o `memo` do `GridTile` foi medido só por raciocínio,
não com o profiler.

**As capturas de tela pararam de funcionar.** `generate-screens.mjs` usa
o Edge em headless; num certo ponto o Edge parou de responder neste
ambiente (nem fora do puppeteer ele devolve DOM). As últimas artboards
foram publicadas **sem conferência visual**. Se precisar de prévias,
investigue o Edge ou troque por outro navegador.

**`Alert` nativo ainda em dois lugares** — excluir cartão na tela de
edição e "Não deu para salvar", ambos em `app/card/[id].tsx`. São
candidatos ao `ConfirmDialog`, mas o Vinícius não pediu a troca. (Na home
o `Alert` sumiu: excluir agora passa pela barra de seleção e pelo
`ConfirmDialog`.)

**O gesto de voltar** (deslizar da borda / botão do Android) na tela de
edição **não** dispara a confirmação de descarte — o guarda está só no
chevron.

**Heredoc do bash quebra** com o HTML das artboards — e com TSX grande
também (`MoveSheet.tsx` falhou com "unexpected EOF" e não escreveu nada).
Use a ferramenta de escrita de arquivo nesses casos.

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

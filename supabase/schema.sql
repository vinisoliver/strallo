-- Esquema da nuvem do strallo.
--
-- Rode uma vez no SQL Editor do Supabase. É um espelho do SQLite do aparelho:
-- as mesmas linhas, com as chaves trocadas de INTEGER local para uuid global.
--
-- Três decisões que valem explicação:
--
--   * As datas são `bigint` em milissegundos, e não `timestamptz`. O relógio
--     que arbitra conflito é o mesmo dos dois lados, e comparar número com
--     número dispensa conversão de fuso na ida e na volta.
--
--   * `deleted_at` existe aqui também. Excluir de verdade faria a linha sumir
--     sem deixar recado, e o aparelho que ainda a tivesse a devolveria na
--     sincronização seguinte.
--
--   * `notes.marks` guarda os trechos sublinhados como pares [início, fim) em
--     JSON, e não marcação dentro do texto. `text` continua sendo exatamente o
--     que a pessoa escreveu.
--
--   * `parent_uuid`, `collection_uuid` e `card_uuid` não têm FOREIGN KEY de
--     propósito. A ordem de chegada das linhas não é garantida: uma subcoleção
--     pode subir antes da pasta que a contém, e a chave estrangeira recusaria
--     a inserção de algo que está correto e só chegou primeiro.

create table if not exists public.collections (
  uuid        text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  sort_key    text not null,
  color       text not null,
  parent_uuid text,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create table if not exists public.cards (
  uuid            text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  reference       text not null,
  meaning         text not null default '',
  sort_key        text not null,
  meaning_key     text not null default '',
  reference_key   text not null default '',
  collection_uuid text,
  created_at      bigint not null,
  updated_at      bigint not null,
  deleted_at      bigint
);

create table if not exists public.notes (
  uuid       text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  card_uuid  text,
  text       text not null,
  marks      text not null default '[]',
  position   integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists public.practice_sessions (
  uuid            text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  mode            text not null,
  answered        integer not null,
  correct         integer not null,
  seconds         integer not null,
  collection_uuid text,
  finished_at     bigint not null,
  created_at      bigint not null,
  updated_at      bigint not null,
  deleted_at      bigint
);

-- Toda leitura da sincronização é "o que mudou desde", por dono.
create index if not exists collections_sync
  on public.collections (user_id, updated_at);
create index if not exists cards_sync
  on public.cards (user_id, updated_at);
create index if not exists notes_sync
  on public.notes (user_id, updated_at);
create index if not exists practice_sessions_sync
  on public.practice_sessions (user_id, updated_at);

-- Sem RLS estas tabelas seriam legíveis por qualquer pessoa com a chave
-- anônima, que é pública e vai embutida no APK. É ela que separa uma conta da
-- outra, e não o segredo da chave.
alter table public.collections       enable row level security;
alter table public.cards             enable row level security;
alter table public.notes             enable row level security;
alter table public.practice_sessions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['collections', 'cards', 'notes', 'practice_sessions'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    -- `with check` além de `using`: sem ele daria para gravar uma linha
    -- carimbada com o user_id de outra pessoa.
    execute format(
      'create policy own_rows on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end $$;

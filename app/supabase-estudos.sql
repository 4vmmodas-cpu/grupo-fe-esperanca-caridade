-- =====================================================================
--  Estudos: livros estudados e o resumo de cada dia de estudo
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
--
--  Quem pode o quê:
--  - Todos os membros liberados veem, cadastram livros e registram estudos.
--  - Quem registrou (ou um dirigente) corrige/apaga o próprio registro.
--  - Apagar um LIVRO (e todos os resumos dele) só dirigentes.
-- =====================================================================

create table if not exists public.livros (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  autor         text,
  obs           text,
  concluido     boolean not null default false,
  criado_por    text,
  criado_por_id uuid default auth.uid() references public.perfis on delete set null,
  criado_em     timestamptz not null default now()
);

create table if not exists public.estudos (
  id              uuid primary key default gen_random_uuid(),
  livro_id        uuid not null references public.livros on delete cascade,
  evento_id       uuid references public.eventos on delete set null,
  data            date not null,
  capitulos       text,
  resumo          text not null,
  presentes       uuid[] not null default '{}',
  presentes_nomes text[] not null default '{}',
  criado_por      text,
  criado_por_id   uuid default auth.uid() references public.perfis on delete set null,
  criado_em       timestamptz not null default now()
);
create index if not exists estudos_livro on public.estudos (livro_id, data);

alter table public.livros  enable row level security;
alter table public.estudos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['livros','estudos'] loop
    execute format('drop policy if exists "%1$s: ver" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: registrar" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: dirigentes" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: autor edita" on public.%1$s', t);
    execute format('create policy "%1$s: ver" on public.%1$s for select to authenticated using (public.aprovado())', t);
    execute format('create policy "%1$s: registrar" on public.%1$s for insert to authenticated with check (public.aprovado() and criado_por_id = auth.uid())', t);
    execute format('create policy "%1$s: dirigentes" on public.%1$s for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
    execute format('create policy "%1$s: autor edita" on public.%1$s for update to authenticated using (public.aprovado() and criado_por_id = auth.uid()) with check (criado_por_id = auth.uid())', t);
  end loop;
end $$;

-- Só o autor apaga o próprio resumo (livros: só dirigentes, pela política acima)
drop policy if exists "estudos: autor exclui" on public.estudos;
create policy "estudos: autor exclui" on public.estudos for delete to authenticated
  using (public.aprovado() and criado_por_id = auth.uid());

-- Tempo real
do $$
declare t text;
begin
  foreach t in array array['livros','estudos'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

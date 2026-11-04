-- =====================================================================
--  Músicas: letras dos pontos cantados da Umbanda
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
--
--  - Todos os membros liberados veem e ESCREVEM letras.
--  - Cada um edita/exclui só o que ele mesmo escreveu.
--  - Dirigentes podem editar/excluir qualquer uma (moderação).
-- =====================================================================

create table if not exists public.musicas (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  linha         text,
  letra         text not null,
  link          text check (link is null or link ~* '^https?://'),
  obs           text,
  criado_por    text,
  criado_por_id uuid default auth.uid() references public.perfis on delete set null,
  criado_em     timestamptz not null default now(),
  editado_em    timestamptz
);

alter table public.musicas enable row level security;
drop policy if exists "musicas: ver"         on public.musicas;
drop policy if exists "musicas: escrever"    on public.musicas;
drop policy if exists "musicas: autor edita" on public.musicas;
drop policy if exists "musicas: autor exclui" on public.musicas;
create policy "musicas: ver" on public.musicas for select to authenticated using (public.aprovado());
create policy "musicas: escrever" on public.musicas for insert to authenticated
  with check (public.aprovado() and criado_por_id = auth.uid());
create policy "musicas: autor edita" on public.musicas for update to authenticated
  using (public.aprovado() and (criado_por_id = auth.uid() or public.eh_admin()))
  with check (criado_por_id = auth.uid() or public.eh_admin());
create policy "musicas: autor exclui" on public.musicas for delete to authenticated
  using (public.aprovado() and (criado_por_id = auth.uid() or public.eh_admin()));

-- Tempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'musicas') then
    alter publication supabase_realtime add table public.musicas;
  end if;
end $$;

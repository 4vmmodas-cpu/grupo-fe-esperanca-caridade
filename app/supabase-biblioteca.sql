-- =====================================================================
--  Biblioteca: PDFs de livros para os membros lerem e baixarem
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
--
--  - Todos os membros liberados veem, leem, baixam e ENVIAM livros.
--  - Cada um edita/exclui só o que ele mesmo enviou.
--  - Dirigentes podem excluir qualquer livro (moderação).
--  - Os arquivos ficam privados: só abre quem está logado e liberado.
-- =====================================================================

create table if not exists public.biblioteca (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  autor         text,
  categoria     text,
  descricao     text,
  arquivo_path  text,
  arquivo_nome  text,
  tamanho       bigint,
  criado_por    text,
  criado_por_id uuid default auth.uid() references public.perfis on delete set null,
  criado_em     timestamptz not null default now()
);

alter table public.biblioteca enable row level security;
drop policy if exists "biblioteca: ver"        on public.biblioteca;
drop policy if exists "biblioteca: dirigentes" on public.biblioteca;
drop policy if exists "biblioteca: enviar"     on public.biblioteca;
drop policy if exists "biblioteca: autor edita" on public.biblioteca;
drop policy if exists "biblioteca: autor exclui" on public.biblioteca;
create policy "biblioteca: ver" on public.biblioteca for select to authenticated using (public.aprovado());
create policy "biblioteca: enviar" on public.biblioteca for insert to authenticated
  with check (public.aprovado() and criado_por_id = auth.uid());
create policy "biblioteca: autor edita" on public.biblioteca for update to authenticated
  using (public.aprovado() and (criado_por_id = auth.uid() or public.eh_admin()))
  with check (criado_por_id = auth.uid() or public.eh_admin());
create policy "biblioteca: autor exclui" on public.biblioteca for delete to authenticated
  using (public.aprovado() and (criado_por_id = auth.uid() or public.eh_admin()));

-- O livro em estudo pode apontar para o PDF da biblioteca
alter table public.livros add column if not exists biblioteca_id uuid references public.biblioteca on delete set null;

-- ---------- Arquivos (até 50 MB por PDF, limite do plano grátis) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('biblioteca', 'biblioteca', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "biblioteca: membros leem"      on storage.objects;
drop policy if exists "biblioteca: dirigentes enviam" on storage.objects;
drop policy if exists "biblioteca: dirigentes trocam" on storage.objects;
drop policy if exists "biblioteca: dirigentes apagam" on storage.objects;
drop policy if exists "biblioteca: membros enviam"  on storage.objects;
drop policy if exists "biblioteca: autor apaga"     on storage.objects;
create policy "biblioteca: membros leem" on storage.objects for select to authenticated
  using (bucket_id = 'biblioteca' and public.aprovado());
create policy "biblioteca: membros enviam" on storage.objects for insert to authenticated
  with check (bucket_id = 'biblioteca' and public.aprovado());
create policy "biblioteca: autor apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'biblioteca' and public.aprovado() and (owner_id = auth.uid()::text or public.eh_admin()));

-- Tempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'biblioteca') then
    alter publication supabase_realtime add table public.biblioteca;
  end if;
end $$;

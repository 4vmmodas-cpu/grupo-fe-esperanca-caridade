-- =====================================================================
--  Estudos v2: curtidas e comentários nos resumos
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
--
--  - Todos os membros liberados curtem e comentam.
--  - Cada um edita/apaga o próprio comentário; dirigentes apagam qualquer um.
-- =====================================================================

-- ---------- Curtidas (lista de quem curtiu) ----------
alter table public.estudos add column if not exists curtidas uuid[] not null default '{}';

-- Ninguém mexe na lista de curtidas pela edição normal; só pelo botão ❤️
create or replace function public.protege_estudo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('fec.curtindo', true) is distinct from 'sim' then
    new.curtidas := old.curtidas;
  end if;
  return new;
end $$;
drop trigger if exists protege_estudo on public.estudos;
create trigger protege_estudo before update on public.estudos
  for each row execute function public.protege_estudo();

-- Cada pessoa curte/descurte só em nome próprio
create or replace function public.curtir_estudo(p_id uuid, p_curtir boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.aprovado() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  perform set_config('fec.curtindo', 'sim', true);
  update public.estudos
     set curtidas = case when p_curtir then array_append(array_remove(curtidas, auth.uid()), auth.uid())
                         else array_remove(curtidas, auth.uid()) end
   where id = p_id;
  perform set_config('fec.curtindo', 'nao', true);
end $$;
revoke all on function public.curtir_estudo(uuid, boolean) from public, anon;
grant execute on function public.curtir_estudo(uuid, boolean) to authenticated;

-- ---------- Comentários ----------
create table if not exists public.estudo_comentarios (
  id            uuid primary key default gen_random_uuid(),
  estudo_id     uuid not null references public.estudos on delete cascade,
  texto         text not null check (length(trim(texto)) between 1 and 2000),
  autor_nome    text,
  criado_por_id uuid not null default auth.uid() references public.perfis on delete cascade,
  criado_em     timestamptz not null default now(),
  editado_em    timestamptz
);
create index if not exists estudo_comentarios_estudo on public.estudo_comentarios (estudo_id, criado_em);

alter table public.estudo_comentarios enable row level security;
drop policy if exists "comentarios: ver"        on public.estudo_comentarios;
drop policy if exists "comentarios: comentar"   on public.estudo_comentarios;
drop policy if exists "comentarios: autor edita" on public.estudo_comentarios;
drop policy if exists "comentarios: apagar"     on public.estudo_comentarios;
create policy "comentarios: ver" on public.estudo_comentarios for select to authenticated
  using (public.aprovado());
create policy "comentarios: comentar" on public.estudo_comentarios for insert to authenticated
  with check (public.aprovado() and criado_por_id = auth.uid());
create policy "comentarios: autor edita" on public.estudo_comentarios for update to authenticated
  using (public.aprovado() and criado_por_id = auth.uid()) with check (criado_por_id = auth.uid());
create policy "comentarios: apagar" on public.estudo_comentarios for delete to authenticated
  using (public.aprovado() and (criado_por_id = auth.uid() or public.eh_admin()));

-- Tempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'estudo_comentarios') then
    alter publication supabase_realtime add table public.estudo_comentarios;
  end if;
end $$;

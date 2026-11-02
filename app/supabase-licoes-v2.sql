-- =====================================================================
--  Atualização: todos os membros podem registrar lições
--  Editar/excluir: quem registrou ou dirigentes.
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
-- =====================================================================

-- Quem registrou a lição
alter table public.licoes add column if not exists criado_por_id uuid default auth.uid() references public.perfis on delete set null;

-- Membros aprovados podem registrar (sempre em nome próprio)
drop policy if exists "licoes: registrar" on public.licoes;
create policy "licoes: registrar" on public.licoes for insert to authenticated
  with check (public.aprovado() and criado_por_id = auth.uid());

-- Quem registrou pode corrigir ou apagar a própria lição
drop policy if exists "licoes: autor edita" on public.licoes;
create policy "licoes: autor edita" on public.licoes for update to authenticated
  using (public.aprovado() and criado_por_id = auth.uid())
  with check (criado_por_id = auth.uid());
drop policy if exists "licoes: autor exclui" on public.licoes;
create policy "licoes: autor exclui" on public.licoes for delete to authenticated
  using (public.aprovado() and criado_por_id = auth.uid());

-- O autor não mexe na lista de quem já fez (isso só pelo botão "Fiz")
create or replace function public.protege_licao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.eh_admin()
     and current_setting('fec.marcando_licao', true) is distinct from 'sim' then
    new.concluidas    := old.concluidas;
    new.criado_por_id := old.criado_por_id;
  end if;
  return new;
end $$;
drop trigger if exists protege_licao on public.licoes;
create trigger protege_licao before update on public.licoes
  for each row execute function public.protege_licao();

-- O botão "Fiz" avisa a proteção acima que é ele quem está mexendo
create or replace function public.marcar_licao(p_id uuid, p_feito boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.aprovado() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  perform set_config('fec.marcando_licao', 'sim', true);
  update public.licoes
     set concluidas = case when p_feito then array_append(array_remove(concluidas, auth.uid()), auth.uid())
                           else array_remove(concluidas, auth.uid()) end
   where id = p_id;
  perform set_config('fec.marcando_licao', 'nao', true);
end $$;
grant execute on function public.marcar_licao(uuid, boolean) to authenticated;

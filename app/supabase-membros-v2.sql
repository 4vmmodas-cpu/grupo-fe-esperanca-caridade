-- =====================================================================
--  Atualização: cada pessoa cuida dos próprios dados de membro
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
-- =====================================================================

-- Liga o registro de Membro à conta de acesso
alter table public.membros add column if not exists perfil_id uuid unique references public.perfis on delete set null;

-- A própria pessoa pode editar o seu registro (WhatsApp, aniversário, endereço, obs)
drop policy if exists "membros: o próprio" on public.membros;
create policy "membros: o próprio" on public.membros for update to authenticated
  using (perfil_id = auth.uid() and public.aprovado())
  with check (perfil_id = auth.uid());

-- ...mas só dirigentes mudam função e vínculo
create or replace function public.protege_membro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = o próprio banco (SQL Editor / funções internas): liberado
  if auth.uid() is not null and not public.eh_admin() then
    new.funcao    := old.funcao;
    new.perfil_id := old.perfil_id;
  end if;
  return new;
end $$;
drop trigger if exists protege_membro on public.membros;
create trigger protege_membro before update on public.membros
  for each row execute function public.protege_membro();

-- Garante que uma conta liberada tenha seu registro em Membros:
-- 1) liga a um membro já cadastrado com o mesmo nome; 2) senão, cria com os dados do cadastro
create or replace function public.garantir_membro(p_perfil uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p   public.perfis;
  meta jsonb;
  m_id uuid;
begin
  select * into p from public.perfis where id = p_perfil;
  if p.id is null or p.papel not in ('membro','admin') then return; end if;
  if exists (select 1 from public.membros where perfil_id = p.id) then return; end if;

  select raw_user_meta_data into meta from auth.users where id = p.id;

  select id into m_id from public.membros
   where perfil_id is null and lower(trim(nome)) = lower(trim(p.nome))
   order by criado_em limit 1;

  if m_id is not null then
    update public.membros set
      perfil_id  = p.id,
      whatsapp   = coalesce(nullif(whatsapp, ''), nullif(meta->>'whatsapp', '')),
      nascimento = coalesce(nascimento, nullif(meta->>'nascimento', '')::date)
    where id = m_id;
  else
    insert into public.membros (nome, whatsapp, nascimento, funcao, perfil_id)
    values (p.nome, nullif(meta->>'whatsapp', ''), nullif(meta->>'nascimento', '')::date,
            case when p.papel = 'admin' then 'Dirigente' else 'Membro' end, p.id);
  end if;
end $$;
revoke all on function public.garantir_membro(uuid) from public, anon, authenticated;

-- Dispara ao liberar alguém (pendente -> membro/admin)
create or replace function public.ao_liberar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.papel in ('membro','admin') then perform public.garantir_membro(new.id); end if;
  return new;
end $$;
drop trigger if exists ao_liberar_perfil on public.perfis;
create trigger ao_liberar_perfil after insert or update of papel on public.perfis
  for each row execute function public.ao_liberar_perfil();

-- Acerta quem JÁ está liberado hoje
do $$
declare r record;
begin
  for r in select id from public.perfis where papel in ('membro','admin') loop
    perform public.garantir_membro(r.id);
  end loop;
end $$;

-- =====================================================================
--  App Fé, Esperança e Caridade — estrutura do banco (Supabase)
--  Cole TUDO no Supabase: SQL Editor > New query > Run.
--  Pode rodar de novo sem problema (o script é idempotente).
-- =====================================================================

-- ---------- Perfis de acesso (1 por conta de login) ----------
create table if not exists public.perfis (
  id         uuid primary key references auth.users on delete cascade,
  nome       text not null,
  email      text,
  papel      text not null default 'pendente' check (papel in ('pendente','membro','admin','bloqueado')),
  criado_em  timestamptz not null default now()
);

-- Funções de permissão (security definer: leem o papel sem esbarrar no RLS)
create or replace function public.papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid()
$$;
create or replace function public.aprovado() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.papel_atual() in ('membro','admin'), false)
$$;
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.papel_atual() = 'admin', false)
$$;

-- Cria o perfil automaticamente no cadastro. O PRIMEIRO cadastro vira dirigente (admin).
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfis) then 'pendente' else 'admin' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

-- Só dirigentes mudam o papel / e-mail (a pessoa pode mudar o próprio nome)
create or replace function public.protege_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() and (new.papel is distinct from old.papel or new.email is distinct from old.email) then
    raise exception 'Sem permissão para alterar o acesso' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists protege_perfil on public.perfis;
create trigger protege_perfil before update on public.perfis
  for each row execute function public.protege_perfil();

-- ---------- Membros ----------
create table if not exists public.membros (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  whatsapp    text,
  nascimento  date,
  funcao      text,
  endereco    text,
  obs         text,
  criado_em   timestamptz not null default now()
);

-- ---------- Agenda ----------
create table if not exists public.eventos (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null default 'Gira',
  titulo          text,
  data            date not null,
  hora            text,
  anfitriao_id    uuid references public.membros on delete set null,
  anfitriao_nome  text,
  local           text,
  obs             text,
  serie_id        uuid,
  criado_em       timestamptz not null default now()
);
create index if not exists eventos_data on public.eventos (data);

-- ---------- Lições das entidades ----------
create table if not exists public.licoes (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid references public.eventos on delete set null,
  data        date not null,
  entidade    text,
  texto       text not null,
  para_todos  boolean not null default true,
  para        uuid[] not null default '{}',
  para_nomes  text[] not null default '{}',
  prazo       date,
  concluidas  uuid[] not null default '{}',
  criado_por  text,
  criado_em   timestamptz not null default now()
);

-- Cada pessoa marca/desmarca só a si mesma como "Fiz"
create or replace function public.marcar_licao(p_id uuid, p_feito boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.aprovado() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.licoes
     set concluidas = case when p_feito then array_append(array_remove(concluidas, auth.uid()), auth.uid())
                           else array_remove(concluidas, auth.uid()) end
   where id = p_id;
end $$;

-- ---------- Finanças ----------
create table if not exists public.lancamentos (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('entrada','saida')),
  valor             integer not null check (valor > 0),   -- em centavos
  data              date not null,
  categoria         text,
  descricao         text,
  tem_comprovante   boolean not null default false,
  comprovante_nome  text,
  comprovante_path  text,
  atualizado_por    text,
  atualizado_em     timestamptz not null default now()
);
create index if not exists lancamentos_data on public.lancamentos (data);

-- Totais por mês: visíveis para todos os membros aprovados (sem os detalhes)
create or replace view public.resumos_mensais as
  select to_char(data, 'YYYY-MM') as mes,
         coalesce(sum(valor) filter (where tipo = 'entrada'), 0)::bigint as entradas,
         coalesce(sum(valor) filter (where tipo = 'saida'), 0)::bigint   as saidas
    from public.lancamentos
   where public.aprovado()
   group by 1;

-- ---------- Segurança (RLS) ----------
alter table public.perfis      enable row level security;
alter table public.membros     enable row level security;
alter table public.eventos     enable row level security;
alter table public.licoes      enable row level security;
alter table public.lancamentos enable row level security;

drop policy if exists "perfis: ver"       on public.perfis;
drop policy if exists "perfis: editar"    on public.perfis;
drop policy if exists "perfis: excluir"   on public.perfis;
create policy "perfis: ver"     on public.perfis for select to authenticated using (id = auth.uid() or public.eh_admin());
create policy "perfis: editar"  on public.perfis for update to authenticated using (id = auth.uid() or public.eh_admin()) with check (id = auth.uid() or public.eh_admin());
create policy "perfis: excluir" on public.perfis for delete to authenticated using (public.eh_admin());

do $$
declare t text;
begin
  foreach t in array array['membros','eventos','licoes'] loop
    execute format('drop policy if exists "%1$s: ver" on public.%1$s', t);
    execute format('drop policy if exists "%1$s: dirigentes" on public.%1$s', t);
    execute format('create policy "%1$s: ver" on public.%1$s for select to authenticated using (public.aprovado())', t);
    execute format('create policy "%1$s: dirigentes" on public.%1$s for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
  end loop;
end $$;

drop policy if exists "lancamentos: dirigentes" on public.lancamentos;
create policy "lancamentos: dirigentes" on public.lancamentos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

grant select on public.resumos_mensais to authenticated;
revoke all on public.resumos_mensais from anon;
grant execute on function public.marcar_licao(uuid, boolean) to authenticated;

-- ---------- Comprovantes (arquivos privados) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "comprovantes: dirigentes" on storage.objects;
create policy "comprovantes: dirigentes" on storage.objects for all to authenticated
  using (bucket_id = 'comprovantes' and public.eh_admin())
  with check (bucket_id = 'comprovantes' and public.eh_admin());

-- ---------- Tempo real (o app atualiza sozinho) ----------
do $$
declare t text;
begin
  foreach t in array array['perfis','membros','eventos','licoes','lancamentos'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

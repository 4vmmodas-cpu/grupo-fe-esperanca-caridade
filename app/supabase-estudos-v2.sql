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

-- =====================================================================
--  Notificações de Estudos
--  - Novo estudo registrado  -> avisa todos (menos quem escreveu)
--  - Novo comentário          -> avisa o autor do resumo
--  Usa a mesma função "lembretes"; o aviso sai na hora (gatilho abaixo)
--  e, se algo falhar, a rodada de 5 em 5 minutos envia depois.
-- =====================================================================
create or replace function public.lembretes_pendentes()
returns table (chave text, endpoint text, p256dh text, auth text, titulo text, corpo text, url text)
language sql stable security definer set search_path = public as $$
  with agora as (select now() as t, (now() at time zone 'America/Sao_Paulo') as local),
  insc as (
    select s.* from push_inscricoes s
    join perfis p on p.id = s.user_id and p.papel in ('membro','admin')
  ),
  -- Encontros: avisa X minutos antes (X escolhido por cada pessoa)
  enc as (
    select e.*, ((e.data + coalesce(nullif(e.hora,''), '19:30')::time) at time zone 'America/Sao_Paulo') as inicio
    from eventos e, agora
    where e.data between (agora.local::date - 1) and (agora.local::date + 2)
  )
  select 'E:' || enc.id || ':' || md5(s.endpoint), s.endpoint, s.p256dh, s.auth,
         '🕯️ ' || coalesce(nullif(enc.titulo,''), enc.tipo) || ' às ' || coalesce(nullif(enc.hora,''), '19:30'),
         concat_ws(' · ',
           case when enc.anfitriao_nome is not null and enc.anfitriao_nome <> '' then 'Casa de ' || enc.anfitriao_nome end,
           nullif(enc.local, '')),
         './'
    from enc, insc s, agora
   where enc.inicio > agora.t
     and enc.inicio - make_interval(mins => s.antecedencia) <= agora.t
     and not exists (select 1 from push_enviados x where x.chave = 'E:' || enc.id || ':' || md5(s.endpoint))
  union all
  -- Lições "para todos" com prazo hoje: avisa às 8h quem ainda não marcou "Fiz"
  select 'L:' || l.id || ':' || md5(s.endpoint), s.endpoint, s.p256dh, s.auth,
         '📜 Prazo de lição hoje' || coalesce(' – ' || nullif(l.entidade,''), ''),
         left(l.texto, 140),
         './?aba=licoes'
    from licoes l, insc s, agora
   where l.prazo = agora.local::date
     and agora.local::time >= time '08:00'
     and l.para_todos
     and not (s.user_id = any(l.concluidas))
     and not exists (select 1 from push_enviados x where x.chave = 'L:' || l.id || ':' || md5(s.endpoint))
  union all
  -- Novo estudo registrado (últimas 3 horas): avisa todos, menos quem escreveu
  select 'S:' || r.id || ':' || md5(s.endpoint), s.endpoint, s.p256dh, s.auth,
         '📚 Novo estudo: ' || lv.titulo,
         concat_ws(' · ', to_char(r.data, 'DD/MM'), nullif(r.capitulos, ''), split_part(coalesce(r.criado_por, ''), ' ', 1))
           || E'\n' || left(r.resumo, 120) || case when length(r.resumo) > 120 then '…' else '' end,
         './?aba=estudos'
    from estudos r join livros lv on lv.id = r.livro_id, insc s, agora
   where r.criado_em > agora.t - interval '3 hours'
     and s.user_id is distinct from r.criado_por_id
     and not exists (select 1 from push_enviados x where x.chave = 'S:' || r.id || ':' || md5(s.endpoint))
  union all
  -- Novo comentário: avisa o autor do resumo (se não foi ele mesmo que comentou)
  select 'C:' || c.id || ':' || md5(s.endpoint), s.endpoint, s.p256dh, s.auth,
         '💬 ' || split_part(coalesce(nullif(c.autor_nome, ''), 'Alguém'), ' ', 1) || ' comentou seu estudo',
         left(c.texto, 140) || case when length(c.texto) > 140 then '…' else '' end,
         './?aba=estudos'
    from estudo_comentarios c join estudos r on r.id = c.estudo_id
    join insc s on s.user_id = r.criado_por_id, agora
   where c.criado_em > agora.t - interval '3 hours'
     and c.criado_por_id is distinct from r.criado_por_id
     and not exists (select 1 from push_enviados x where x.chave = 'C:' || c.id || ':' || md5(s.endpoint));
$$;
revoke all on function public.lembretes_pendentes() from public, anon, authenticated;
grant execute on function public.lembretes_pendentes() to service_role;

-- Dispara a função "lembretes" na hora em que entra um estudo ou comentário
create extension if not exists pg_net;
create or replace function public.avisar_agora() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url     := 'https://bbkwxuczioronhwggnep.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJia3d4dWN6aW9yb25od2dnbmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDgzNjIsImV4cCI6MjEwOTIyNDM2Mn0.s3YX-hfVzHdYUMGjQrDkf7UMHuxdMCQkmIdY_dDv2zM'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000);
  return null;
exception when others then
  return null;   -- se o aviso falhar, o registro é salvo do mesmo jeito
end $$;
drop trigger if exists avisar_estudo on public.estudos;
create trigger avisar_estudo after insert on public.estudos
  for each statement execute function public.avisar_agora();
drop trigger if exists avisar_comentario on public.estudo_comentarios;
create trigger avisar_comentario after insert on public.estudo_comentarios
  for each statement execute function public.avisar_agora();

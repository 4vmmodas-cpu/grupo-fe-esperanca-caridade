-- =====================================================================
--  Notificações push – parte 1 (estrutura)
--  Cole no Supabase: SQL Editor > New query > Run.  (pode rodar de novo)
-- =====================================================================

-- Aparelhos que aceitaram receber notificações (1 linha por celular/navegador)
create table if not exists public.push_inscricoes (
  endpoint        text primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh          text not null,
  auth            text not null,
  antecedencia    integer not null default 120 check (antecedencia between 10 and 1440), -- minutos antes do encontro
  aparelho        text,
  criado_em       timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
drop policy if exists "push: o próprio" on public.push_inscricoes;
create policy "push: o próprio" on public.push_inscricoes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Registro do que já foi enviado (evita aviso repetido). Só o servidor mexe.
create table if not exists public.push_enviados (
  chave       text primary key,
  enviado_em  timestamptz not null default now()
);
alter table public.push_enviados enable row level security;

-- Lista os avisos que estão na hora de sair (usada pela função "lembretes")
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
         './'
    from licoes l, insc s, agora
   where l.prazo = agora.local::date
     and agora.local::time >= time '08:00'
     and l.para_todos
     and not (s.user_id = any(l.concluidas))
     and not exists (select 1 from push_enviados x where x.chave = 'L:' || l.id || ':' || md5(s.endpoint));
$$;
revoke all on function public.lembretes_pendentes() from public, anon, authenticated;
grant execute on function public.lembretes_pendentes() to service_role;

-- Limpeza: apaga registros de envio com mais de 60 dias
create or replace function public.limpar_push_enviados() returns void
language sql security definer set search_path = public as $$
  delete from push_enviados where enviado_em < now() - interval '60 days';
$$;
revoke all on function public.limpar_push_enviados() from public, anon, authenticated;

-- =====================================================================
--  Notificações push – parte 2 (agendador)
--  Rode DEPOIS de publicar a função "lembretes" (veja LEIA-ME).
--  Chama a função a cada 5 minutos.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'fec-lembretes';

select cron.schedule(
  'fec-lembretes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://bbkwxuczioronhwggnep.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJia3d4dWN6aW9yb25od2dnbmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDgzNjIsImV4cCI6MjEwOTIyNDM2Mn0.s3YX-hfVzHdYUMGjQrDkf7UMHuxdMCQkmIdY_dDv2zM'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para conferir:  select * from cron.job_run_details order by start_time desc limit 5;
-- Respostas da função: select status_code, content from net._http_response order by created desc limit 5;

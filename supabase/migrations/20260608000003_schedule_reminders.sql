-- Schedule the send-reminders edge function every 5 minutes via pg_cron + pg_net.
-- The shared secret is read from Vault (name 'cron_secret') at run time, so it is
-- never written into this migration or git. Seed that Vault secret out-of-band
-- before this runs (the project keeps it in .secrets.local / Supabase secrets).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent re-apply: drop any prior version of the job first.
select cron.unschedule('send-reminders-5min')
where exists (select 1 from cron.job where jobname = 'send-reminders-5min');

select cron.schedule(
  'send-reminders-5min',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://tgyowiudxkkqfdrfrfbf.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

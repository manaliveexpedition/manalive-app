-- Schedule the weekly digest. Runs hourly; the function itself only sends in the
-- evening window on a man's Day 7/14/21/28 and dedupes per (user, week), so hourly
-- is just resilience: a failed/missed run retries on the next tick. pg_cron +
-- pg_net + the Vault 'cron_secret' are already in place from the reminders job.
select cron.unschedule('send-weekly-digest-hourly')
where exists (select 1 from cron.job where jobname = 'send-weekly-digest-hourly');

select cron.schedule(
  'send-weekly-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://tgyowiudxkkqfdrfrfbf.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- Who gets a text when someone registers for the LIVE training (lib/live-training/store.ts).
alter table public.live_training_config add column if not exists notify_phone text;

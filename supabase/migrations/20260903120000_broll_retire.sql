-- A clip can be UNUSABLE without being missing, and the library had no way to
-- say so. One Kling generation covered a phone screen in garbled pseudo-text —
-- the exact failure CLAUDE.md warns about for generated on-screen text — and
-- because nothing marked it bad it was served into four videos before anyone
-- looked at a frame. Deleting the row would lose the credits we paid and the
-- record of why it must not come back.
alter table public.broll_assets
  add column if not exists retired_at timestamptz,
  add column if not exists retired_reason text;

comment on column public.broll_assets.retired_at is
  'Set when a clip must never be served again. findClips() excludes these. Kept rather than deleted so the spend and the reason survive.';

-- A CLIENT SHOWING A BARBER WHAT THEY WANT.
--
-- The problem this exists for is not "what would that look like on me". It is
-- the gap between what a client asks for and what a barber hears: "number two
-- on the sides" means different things to different people, and the cost of the
-- mismatch is a bad cut and sometimes a lost client.
--
-- So a session holds three things: photos of the actual head, a style picked
-- from a PARAMETER SPACE rather than a catalogue, and the instructions those
-- two produce. The instructions are the artifact — a picture makes a barber
-- guess, and a guess cannot be argued with before the clippers start.
--
-- PHOTOS ARE PRIVATE, WHICH IS NEW HERE. All nine existing storage buckets in
-- this project are public. These are pictures of a named person's head from
-- five angles, so they go in a private bucket reached by signed URL. A public
-- object URL for this content would be a quiet mistake that stays quiet.
--
-- INTERNAL AND SINGLE-USER FOR NOW. This ships as a gated tool for the barber
-- to try on himself before anyone else sees it, so there is no client-facing
-- auth here yet and no per-tenant key. When it goes public both are needed, and
-- the absence is deliberate rather than forgotten.

create table if not exists public.hairstyle_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Free text while this is internal: whoever is being cut. Becomes a real
  -- reference when the tool leaves the building.
  subject_name text,

  -- Storage paths in the private bucket, keyed by shot id
  -- ("front" | "left" | "right" | "back" | "top"). Paths, not URLs, so the
  -- signing policy can change without rewriting rows.
  shots jsonb not null default '{}'::jsonb,

  -- The three knobs from lib/fade-geometry: height, bottom, topGuard.
  -- Stored as the SPEC rather than a rendered name, so a change to the
  -- vocabulary re-derives old sessions instead of stranding them.
  fade_spec jsonb,

  -- Self-reported, and never rendered as a measurement.
  current_length_inches numeric,

  client_note text,

  -- The derived instructions as sent. Frozen: a later change to the derivation
  -- must not silently rewrite what a barber was actually told.
  request jsonb,

  -- 'capturing' - shots being taken
  -- 'styling'   - shots done, picking a look
  -- 'ready'     - instructions derived
  -- 'sent'      - handed to a barber
  status text not null default 'capturing'
    check (status in ('capturing', 'styling', 'ready', 'sent')),

  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hairstyle_sessions_recent_idx
  on public.hairstyle_sessions (created_at desc);

create or replace function public.hairstyle_sessions_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hairstyle_sessions_set_updated_at on public.hairstyle_sessions;
create trigger hairstyle_sessions_set_updated_at
  before update on public.hairstyle_sessions
  for each row execute function public.hairstyle_sessions_touch();

alter table public.hairstyle_sessions enable row level security;

comment on table public.hairstyle_sessions is
  'HairStyle Selector: five head shots, a fade spec, and the barber instructions derived from them. Photos live in a PRIVATE bucket - unlike every other bucket in this project - because they are pictures of a named person. RLS on with no policies; service-role only, behind isAdmin().';

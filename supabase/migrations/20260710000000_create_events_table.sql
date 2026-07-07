-- Barber/beauty/wellness industry events, sourced by an admin pasting an
-- event page URL into the event-submission tool (app/tools/event-submission)
-- rather than bulk API import — Eventbrite killed its public event-search
-- API in Feb 2020, so there's no "discover events near X" endpoint left for
-- third parties; only a specific known event/venue/org can be fetched by ID.
-- source_url is the natural dedupe key (same role place_id plays for
-- agent_salon_leads) since every row originates from one specific page.
--
-- No stored status/is_past column on purpose — "upcoming" is computed at
-- query time (event_date >= CURRENT_DATE) instead of relying on a column
-- that would need a cron job to stay correct. Past events remain queryable
-- by direct ID (profile page + AI Mode chat-link continuity), just excluded
-- from default browse/search results.
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    venue_name TEXT,
    address TEXT,
    city TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    category TEXT,
    organizer_name TEXT,
    ticket_url TEXT,
    source_url TEXT UNIQUE NOT NULL,
    image_url TEXT,
    price_info TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to events"
  ON public.events FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS events_embedding_idx
  ON public.events
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS events_event_date_idx
  ON public.events (event_date);

CREATE INDEX IF NOT EXISTS events_city_idx
  ON public.events (city);

CREATE INDEX IF NOT EXISTS events_category_idx
  ON public.events (category);

-- THE STUDENT JOURNEY LAYER.
--
-- Everything here exists to answer one question the site currently cannot:
-- who is this person, and where are they in the process? The AI Mode chat on
-- /tools/barbershop-search is stateless — its entire memory is sessionStorage,
-- wiped when the tab closes — so the same student re-explains their state,
-- their licence track and their exam date on every visit. That is also the
-- honest reason to ask anyone to make an account: the answers get better
-- afterwards, and nothing else on offer is worth a signup to someone who owns
-- no listing.
--
-- WHY THESE TABLES ARE PRIVATE AND community_members IS NOT. That table is a
-- public directory by design and its RLS policy says so (`USING (true)`). An
-- exam date, a school, a ZIP and a set of hours attached to a named person is
-- not directory data — it is a profile of a student's circumstances. So every
-- table below follows the gbp_connections pattern instead: RLS enabled, NO
-- policies at all, which means only the service-role key reaches it and every
-- read goes through server code that has already checked who is asking.

-- 1. WHICH AUDIENCE THIS MEMBER IS.
--
-- Nullable on purpose. Every existing member predates this column and we do
-- not know what they are; defaulting them all to 'professional' would be a
-- guess written into the database, and the lifecycle emails read this column
-- to decide what to send. NULL means "not asked yet", which is true.
ALTER TABLE public.community_members
    ADD COLUMN IF NOT EXISTS audience TEXT;

ALTER TABLE public.community_members
    DROP CONSTRAINT IF EXISTS community_members_audience_check;

ALTER TABLE public.community_members
    ADD CONSTRAINT community_members_audience_check
    CHECK (audience IS NULL OR audience IN ('student', 'professional', 'owner', 'school'));

COMMENT ON COLUMN public.community_members.audience IS
    'Which audience registry entry this member belongs to — see lib/audiences.ts. NULL means never asked (every member created before 2026-08-12).';

CREATE INDEX IF NOT EXISTS community_members_audience_idx
    ON public.community_members (audience)
    WHERE audience IS NOT NULL;

-- 2. THE JOURNEY ITSELF. One row per member, not a history — this is current
-- state, and a student who moves their exam date wants the new date used, not
-- an audit trail of when they changed it.
CREATE TABLE IF NOT EXISTS public.member_journeys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id UUID NOT NULL UNIQUE REFERENCES public.community_members(id) ON DELETE CASCADE,

    -- Two-letter state, constrained to what the site actually covers. A
    -- student in a state we have no data for must not be silently accepted
    -- and then served Texas rules; the app routes them somewhere honest.
    state               TEXT CHECK (state IS NULL OR state IN ('TX', 'CA', 'MD')),

    -- The specific licence. Texas issues eight separate specialty licences
    -- with genuinely different exams, so this is not decoration — it decides
    -- which kit list, bulletin and requirements page apply.
    track               TEXT CHECK (track IS NULL OR track IN (
                            'barber', 'cosmetology', 'esthetician', 'manicurist',
                            'eyelash', 'hair_weaving', 'hairstylist',
                            'electrologist', 'undecided')),

    -- Free text as the student typed it, kept even after school_id resolves —
    -- if the fuzzy match was wrong, the original is the only way to notice.
    school_name         TEXT,
    -- Deliberately NOT a foreign key: schools live in two different tables
    -- (agent_barber_school_leads, agent_cosmetology_school_leads) and a
    -- dual-programme school appears in both. school_table records which.
    school_id           UUID,
    school_table        TEXT CHECK (school_table IS NULL OR school_table IN (
                            'agent_barber_school_leads', 'agent_cosmetology_school_leads')),

    -- The highest-value field on the row: it is the date this person becomes
    -- a licensed professional looking for a chair.
    exam_date           DATE,
    expected_graduation DATE,

    -- Where they intend to work, which is not always where they study.
    zip                 TEXT CHECK (zip IS NULL OR zip ~ '^\d{5}$'),

    hours_completed     INTEGER CHECK (hours_completed IS NULL OR hours_completed >= 0),
    hours_required      INTEGER CHECK (hours_required IS NULL OR hours_required >= 0),

    -- Set when they tell us they passed. Ends the exam sequence permanently —
    -- see currentPhase() in lib/member-journey.ts, where this outranks every
    -- piece of date arithmetic.
    licensed_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drives the milestone cron: "whose exam is N days out".
CREATE INDEX IF NOT EXISTS member_journeys_exam_date_idx
    ON public.member_journeys (exam_date)
    WHERE exam_date IS NOT NULL AND licensed_at IS NULL;

CREATE OR REPLACE FUNCTION update_member_journeys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_journeys_updated_at ON public.member_journeys;
CREATE TRIGGER member_journeys_updated_at
    BEFORE UPDATE ON public.member_journeys
    FOR EACH ROW EXECUTE FUNCTION update_member_journeys_updated_at();

ALTER TABLE public.member_journeys ENABLE ROW LEVEL SECURITY;
-- No policies → service-role only. See the header.

-- 3. THE AGENT'S MEMORY.
--
-- Split thread/message rather than a jsonb blob per conversation: the
-- milestone jobs and the console both want "what did they last ask about",
-- and that is a query over messages, not a document to parse.
CREATE TABLE IF NOT EXISTS public.member_agent_threads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id UUID NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,
    -- Derived from the first user message. Nullable so a thread can exist
    -- before it has been named.
    title               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_agent_threads_member_idx
    ON public.member_agent_threads (community_member_id, updated_at DESC);

DROP TRIGGER IF EXISTS member_agent_threads_updated_at ON public.member_agent_threads;
CREATE TRIGGER member_agent_threads_updated_at
    BEFORE UPDATE ON public.member_agent_threads
    FOR EACH ROW EXECUTE FUNCTION update_member_journeys_updated_at();

CREATE TABLE IF NOT EXISTS public.member_agent_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   UUID NOT NULL REFERENCES public.member_agent_threads(id) ON DELETE CASCADE,
    -- 'model' not 'assistant', matching what the chat route and the client
    -- already put on the wire — translating between two names for the same
    -- role at the storage boundary is a bug waiting to happen.
    role        TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_agent_messages_thread_idx
    ON public.member_agent_messages (thread_id, created_at);

ALTER TABLE public.member_agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_agent_messages ENABLE ROW LEVEL SECURITY;

-- 4. CHECKLIST PROGRESS, SERVER-SIDE.
--
-- The kit checklist already works for anonymous visitors in localStorage and
-- must keep working — nobody should have to sign in to tick a box. This is
-- what an account adds: the same list on their phone at the exam and on the
-- laptop where they packed.
--
-- checklist_key is the page path, so the seven kit pages don't collide (the
-- localStorage version used one shared key for all of them, which meant a
-- cosmetology student's ticks appeared on the barber list). item_key is the
-- item's label — stable enough, and re-wording an item resetting its tick is
-- the correct outcome, since it is no longer the same item.
CREATE TABLE IF NOT EXISTS public.member_checklist_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id UUID NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,
    checklist_key       TEXT NOT NULL,
    item_key            TEXT NOT NULL,
    checked_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (community_member_id, checklist_key, item_key)
);

CREATE INDEX IF NOT EXISTS member_checklist_items_lookup_idx
    ON public.member_checklist_items (community_member_id, checklist_key);

ALTER TABLE public.member_checklist_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_journeys IS
    'A student member''s current position in their licence journey. Read by /api/chat to ground the agent, by /account/journey, and by the milestone emails. Private: service-role access only.';
COMMENT ON TABLE public.member_agent_threads IS
    'Persisted AI Mode conversations for signed-in members. Anonymous chats stay in sessionStorage and are never written here.';
COMMENT ON TABLE public.member_checklist_items IS
    'Server-side kit checklist progress, keyed by page path so the seven kit lists do not collide.';

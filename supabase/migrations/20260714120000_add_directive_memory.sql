-- Lets agents remember what they've already flagged instead of re-surfacing
-- the same finding every run, and captures WHY a directive was denied so
-- future runs can adapt (e.g. raise a threshold that keeps getting
-- dismissed as "too minor"). subject_key is a per-agent-normalized "what is
-- this about" string (a URL, a query, a city) used to match a new finding
-- against an existing open one instead of blindly inserting a duplicate.
alter table agent_directives
  add column if not exists subject_key text,
  add column if not exists first_seen_at timestamptz default now(),
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists times_recurred int not null default 1,
  add column if not exists deny_reason text;

create index if not exists agent_directives_subject_idx
  on agent_directives (agent_name, subject_key, status);

-- Constraint name is looked up rather than assumed (Postgres's default
-- naming for an inline CHECK isn't guaranteed to match a hand-guessed name).
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'agent_directives' AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE agent_directives DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE agent_directives ADD CONSTRAINT agent_directives_status_check
  CHECK (status in ('pending', 'approved', 'denied', 'resolved'));

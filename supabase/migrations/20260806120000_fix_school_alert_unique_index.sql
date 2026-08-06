-- ============================================================
-- Fix the school_pass_rate_alerts dedupe index
-- ============================================================
-- The original index was on (lower(email), school_id). That is a FUNCTIONAL
-- index, and Postgres will not match it against an ON CONFLICT clause that
-- names plain columns — which is what supabase-js emits for
-- `onConflict: "email,school_id"`. Every signup failed with:
--
--   there is no unique or exclusion constraint matching the ON CONFLICT
--   specification
--
-- The route returned a 500 and the visitor saw "Couldn't save that", so the
-- table stayed empty. Caught by posting through the route after the
-- migrations landed rather than by reading the SQL back.
--
-- Fixed on the plain columns, with the route lowercasing the address before
-- it inserts. Same case-insensitive dedupe, expressed where ON CONFLICT can
-- see it.
-- ============================================================

DROP INDEX IF EXISTS public.school_pass_rate_alerts_email_school_idx;

-- Any rows written before this point could carry mixed case. There are none
-- in practice (the insert never succeeded), but normalising first means the
-- unique index below cannot fail to build on a re-run.
UPDATE public.school_pass_rate_alerts SET email = lower(email) WHERE email <> lower(email);

CREATE UNIQUE INDEX IF NOT EXISTS school_pass_rate_alerts_email_school_idx
  ON public.school_pass_rate_alerts (email, school_id);

-- Public read (dashboard uses the anon key via a server action); writes only
-- via the service-role key from app/api/keyword-intelligence/fetch, never
-- from the client, so no public INSERT/UPDATE/DELETE policy is added.
ALTER TABLE public.keyword_intelligence_pulls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to keyword_intelligence_pulls"
  ON public.keyword_intelligence_pulls FOR SELECT USING (true);

-- ShearQuery Reviews — public reviews left directly on an entity's own
-- profile page (distinct from the underlying Google rating/review_count
-- already shown elsewhere, which stays untouched — this is a second,
-- platform-native review layer).
--
-- entity_type/entity_id is the same polymorphic-association pattern
-- already used by community_member_entity_links: one table serves every
-- entity type rather than a separate reviews table per type. Only shop
-- and salon pages render the CTA/section today (that's the only place
-- the request is scoped to), but the schema covers all 6 entity types so
-- barbers/cosmetologists/schools/stores can get the same feature later
-- without another migration.
--
-- status defaults to 'approved' (reviews show immediately, no moderation
-- queue yet) — deliberately simple for launch, but the column exists from
-- day one specifically so a moderation workflow can be added later
-- without a schema change, just a default-value flip and an admin UI.
CREATE TABLE IF NOT EXISTS public.shearquery_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('shop', 'salon', 'barber', 'cosmetologist', 'school', 'store')),
  entity_id      UUID NOT NULL,
  reviewer_name  TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text    TEXT,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shearquery_reviews_entity_idx ON public.shearquery_reviews (entity_type, entity_id, status);

-- Locked to service-role only, same as community_member_entity_links —
-- reviewer_email must never be reachable via a direct anon-key REST call
-- even though the reviews themselves are public content. All reads
-- (entity pages) and writes (the submission form) go through
-- lib/reviews.ts / app/api/reviews, which strip email before anything
-- reaches the client.
ALTER TABLE public.shearquery_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
ON public.shearquery_reviews
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

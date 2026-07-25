-- Claiming now works for every entity type (each entity page has a claim CTA
-- and earns the green badge from a link row), so widen the entity_type check
-- on community_member_entity_links beyond the original shop/salon.
ALTER TABLE public.community_member_entity_links
  DROP CONSTRAINT IF EXISTS community_member_entity_links_entity_type_check;

ALTER TABLE public.community_member_entity_links
  ADD CONSTRAINT community_member_entity_links_entity_type_check
  CHECK (entity_type IN (
    'shop', 'salon',
    'barber_school', 'cosmetology_school',
    'barber_supply_store', 'beauty_supply_store',
    'barber', 'cosmetologist', 'event'
  ));

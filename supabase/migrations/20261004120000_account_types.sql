-- The account types, redrawn by the product owner on 2026-09-28:
--   student, barber, cosmetologist, barbershop, salon, school,
--   supply_store, agency, client
--
-- Retired types move to their successors (lib/audiences.ts keeps aliases so
-- old links and stored values still resolve):
--   professional     -> barber
--   owner            -> barbershop
--   service_customer -> client
--
-- One type per account; the business type wins for an owner who also cuts.
--
-- ORDER MATTERS, and the first version got it wrong: the old check constraint
-- does not allow the new names, so it has to be dropped BEFORE the rows move,
-- and the new one added after. Updating first failed with 23514 on the first
-- 'barber' row (the whole migration rolled back; nothing changed).

alter table public.community_members
  drop constraint if exists community_members_audience_check;

update public.community_members set audience = 'barber'     where audience = 'professional';
update public.community_members set audience = 'barbershop' where audience = 'owner';
update public.community_members set audience = 'client'     where audience = 'service_customer';

-- Pending invites carry the type to stamp on sign-in; move them too.
-- (app/auth/callback also normalises, for any written after this runs.)
update public.account_conversion_invites set audience = 'barber'     where audience = 'professional';
update public.account_conversion_invites set audience = 'barbershop' where audience = 'owner';
update public.account_conversion_invites set audience = 'client'     where audience = 'service_customer';

-- TRANSITIONAL: the old names stay allowed for now. The site running when
-- this is applied still writes 'professional', 'owner' and
-- 'service_customer'; rejecting them here would break every signup between
-- this migration and the deploy of the new code. A later migration removes
-- them once no deployed code can write them.
alter table public.community_members
  add constraint community_members_audience_check
  check (audience is null or audience in (
    'student', 'barber', 'cosmetologist', 'barbershop', 'salon',
    'school', 'supply_store', 'agency', 'client',
    'professional', 'owner', 'service_customer'
  ));

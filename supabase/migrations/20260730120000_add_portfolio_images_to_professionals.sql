-- Owner-uploaded portfolio photos for barbers and cosmetologists.
--
-- These two tables already carry image columns, but none of them belong to the
-- professional: booksy_photo_url / booksy_cover_photo_url / booksy_gallery_urls
-- are scraped from Booksy, and passport_image_url is licensure evidence. A
-- member editing their own profile had nowhere to put their work, which matters
-- more here than on a storefront — shops filling a chair judge a stylist on
-- photographs, not prose.
--
-- Kept separate from booksy_gallery_urls rather than appended to it, for two
-- reasons: a Booksy re-scrape overwrites that column wholesale and would erase
-- anything the member added, and the profile pages need to know which photos are
-- the owner's so those can be shown first.
ALTER TABLE public.agent_barber_leads
  ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.agent_cosmetologist_leads
  ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]'::jsonb;

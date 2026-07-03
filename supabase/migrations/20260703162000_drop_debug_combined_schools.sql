-- Cleanup: drop the temporary debug function used to diagnose a school_category
-- mismatch bug during cosmetology-schools integration.
DROP FUNCTION IF EXISTS public.debug_combined_schools();

-- 030_close_legacy_tickets.sql
-- Closes the initial test support tickets that were lingering in the database.

UPDATE public.software_tickets
SET 
    status = 'closed',
    updated_at = NOW()
WHERE id IN (
    '0f390d49-cef0-46bb-bdb9-25f3cc6d33ed',
    '2b805868-d808-43ed-b435-131e6eff9d36',
    '77bcb521-0bd0-44d7-aed8-184b09878b5d'
);

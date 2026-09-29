-- Guest booking from an AI (no account, text code + guest pass) was replaced
-- the same day by a free client account (lib/mcp/client-booking-tools.ts), so
-- the pass table is unused.
drop table if exists public.calendar_guest_passes;

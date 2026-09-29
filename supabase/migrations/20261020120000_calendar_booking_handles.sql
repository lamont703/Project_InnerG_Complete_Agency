-- A short public handle per bookable calendar, for its "Book me" page
-- (/book/<handle>) and for clients' AI assistants to find it by
-- ("book with marcus-cuts on ShearQuery"). Made from the calendar's name the
-- first time it's needed (lib/calendar/booking-handle.ts).

alter table public.calendar_providers
  add column if not exists booking_handle text;
create unique index if not exists uq_calendar_providers_booking_handle
  on public.calendar_providers (booking_handle) where booking_handle is not null;

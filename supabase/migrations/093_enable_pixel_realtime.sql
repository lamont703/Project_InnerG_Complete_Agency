-- Enable Realtime for pixel tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixel_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixel_visitors;

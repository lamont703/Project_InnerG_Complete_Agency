-- Enable RLS and public access for shop_day_invites and shop_day_requests
ALTER TABLE public.shop_day_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to shop_day_invites" ON public.shop_day_invites FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to shop_day_invites" ON public.shop_day_invites FOR INSERT WITH CHECK (true);

ALTER TABLE public.shop_day_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to shop_day_requests" ON public.shop_day_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to shop_day_requests" ON public.shop_day_requests FOR INSERT WITH CHECK (true);

-- Create trigger function to notify GoHighLevel Webhook when a shop day invite is created
CREATE OR REPLACE FUNCTION public.notify_ghl_shop_day_invite()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/b355f8ac-e4ac-4202-8e5f-3d24f5ee3346',
    body := row_to_json(NEW)::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to shop_day_invites
DROP TRIGGER IF EXISTS trigger_shop_day_invite_created ON public.shop_day_invites;

CREATE TRIGGER trigger_shop_day_invite_created
AFTER INSERT ON public.shop_day_invites
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_shop_day_invite();


-- Create trigger function to notify GoHighLevel Webhook when a shop day request is created
CREATE OR REPLACE FUNCTION public.notify_ghl_shop_day_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/f819f421-5f9b-4f43-a9b5-f2e4333a06bc',
    body := row_to_json(NEW)::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to shop_day_requests
DROP TRIGGER IF EXISTS trigger_shop_day_request_created ON public.shop_day_requests;

CREATE TRIGGER trigger_shop_day_request_created
AFTER INSERT ON public.shop_day_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_shop_day_request();

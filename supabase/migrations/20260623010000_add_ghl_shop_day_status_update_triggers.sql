-- Create trigger function to notify GoHighLevel Webhook when a shop day invite status is updated
CREATE OR REPLACE FUNCTION public.notify_ghl_shop_day_invite_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if the status actually changed
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
     PERFORM net.http_post(
       -- GoHighLevel Webhook URL for Invite Status Updates
       url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/f686cd00-e0f9-409d-b944-4438b3635f6d',
       body := json_build_object(
         'id', NEW.id,
         'old_status', OLD.status,
         'new_status', NEW.status,
         'record', row_to_json(NEW)
       )::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb
     );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to shop_day_invites
DROP TRIGGER IF EXISTS trigger_shop_day_invite_status_update ON public.shop_day_invites;

CREATE TRIGGER trigger_shop_day_invite_status_update
AFTER UPDATE ON public.shop_day_invites
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_shop_day_invite_status_update();


-- Create trigger function to notify GoHighLevel Webhook when a shop day request status is updated
CREATE OR REPLACE FUNCTION public.notify_ghl_shop_day_request_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if the status actually changed
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
     PERFORM net.http_post(
       -- REPLACE with your GoHighLevel Webhook URL for Request Status Updates
       url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/YOUR_REQUEST_STATUS_UPDATE_WEBHOOK',
       body := json_build_object(
         'id', NEW.id,
         'old_status', OLD.status,
         'new_status', NEW.status,
         'record', row_to_json(NEW)
       )::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb
     );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to shop_day_requests
DROP TRIGGER IF EXISTS trigger_shop_day_request_status_update ON public.shop_day_requests;

CREATE TRIGGER trigger_shop_day_request_status_update
AFTER UPDATE ON public.shop_day_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_shop_day_request_status_update();

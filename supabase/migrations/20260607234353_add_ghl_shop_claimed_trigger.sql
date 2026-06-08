-- Create trigger function to notify GoHighLevel Webhook when a shop is claimed
CREATE OR REPLACE FUNCTION public.notify_ghl_shop_claimed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute HTTP POST if outreach_status changes specifically to 'shop claimed'
  IF (NEW.outreach_status = 'shop claimed' AND (OLD.outreach_status != 'shop claimed' OR OLD.outreach_status IS NULL)) THEN
     
       PERFORM net.http_post(
         url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/89c13ed3-7e09-41e2-b55f-c62a1165b535',
         body := json_build_object(
           'contact_id', NEW.contact_id,
           'new_record', row_to_json(NEW)
         )::jsonb,
         headers := '{"Content-Type": "application/json"}'::jsonb
       );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to agent_barbershop_leads
DROP TRIGGER IF EXISTS trigger_barbershop_shop_claimed ON public.agent_barbershop_leads;

CREATE TRIGGER trigger_barbershop_shop_claimed
AFTER UPDATE ON public.agent_barbershop_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_shop_claimed();

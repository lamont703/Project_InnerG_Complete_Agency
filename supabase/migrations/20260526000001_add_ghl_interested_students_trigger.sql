-- Create trigger function to notify GoHighLevel Webhook
CREATE OR REPLACE FUNCTION public.notify_ghl_interested_students()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute HTTP POST if booth_count goes to >= 1 OR hiring_need goes to true
  IF (NEW.booth_count_available >= 1 AND (OLD.booth_count_available < 1 OR OLD.booth_count_available IS NULL)) OR
     (NEW.hiring_need = true AND (OLD.hiring_need = false OR OLD.hiring_need IS NULL)) THEN
     
     PERFORM net.http_post(
       url := 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/f5baeadc-38a5-411a-80dc-079b86ca44c3',
       body := json_build_object(
         'contact_id', NEW.contact_id,
         'new_record', row_to_json(NEW)
       )::text,
       headers := '{"Content-Type": "application/json"}'::jsonb
     );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to agent_barbershop_leads
DROP TRIGGER IF EXISTS trigger_barbershop_interested_students ON public.agent_barbershop_leads;

CREATE TRIGGER trigger_barbershop_interested_students
AFTER UPDATE ON public.agent_barbershop_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_ghl_interested_students();

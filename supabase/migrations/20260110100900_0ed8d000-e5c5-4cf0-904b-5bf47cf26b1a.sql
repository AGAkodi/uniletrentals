-- Update the generate_agent_id function to use "ULT-AGT-" prefix
CREATE OR REPLACE FUNCTION public.generate_agent_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(agent_id FROM 9) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.agent_verifications
  WHERE agent_id IS NOT NULL;
  
  new_id := 'ULT-AGT-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$function$;
-- Create shared_rentals table
CREATE TABLE public.shared_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  host_student_id UUID NOT NULL,
  gender_preference TEXT NOT NULL CHECK (gender_preference IN ('male', 'female', 'any')),
  total_rent NUMERIC NOT NULL,
  rent_split NUMERIC NOT NULL,
  description TEXT,
  move_in_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_rentals ENABLE ROW LEVEL SECURITY;

-- Anyone can view active shared rentals
CREATE POLICY "Anyone can view active shared rentals"
ON public.shared_rentals
FOR SELECT
USING (status = 'active' OR auth.uid() = host_student_id OR has_role(auth.uid(), 'admin'::user_role));

-- Verified students can create shared rentals
CREATE POLICY "Verified students can create shared rentals"
ON public.shared_rentals
FOR INSERT
WITH CHECK (
  auth.uid() = host_student_id 
  AND has_role(auth.uid(), 'student'::user_role)
);

-- Host students can update their own shared rentals
CREATE POLICY "Host students can update own shared rentals"
ON public.shared_rentals
FOR UPDATE
USING (auth.uid() = host_student_id OR has_role(auth.uid(), 'admin'::user_role));

-- Host students and admins can delete shared rentals
CREATE POLICY "Host students and admins can delete shared rentals"
ON public.shared_rentals
FOR DELETE
USING (auth.uid() = host_student_id OR has_role(auth.uid(), 'admin'::user_role));

-- Create updated_at trigger
CREATE TRIGGER update_shared_rentals_updated_at
BEFORE UPDATE ON public.shared_rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create shared_rental_interests table
CREATE TABLE public.shared_rental_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_rental_id UUID NOT NULL REFERENCES public.shared_rentals(id) ON DELETE CASCADE,
  interested_student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shared_rental_id, interested_student_id)
);

-- Enable RLS
ALTER TABLE public.shared_rental_interests ENABLE ROW LEVEL SECURITY;

-- Students can view interests on their shared rentals or their own interests
CREATE POLICY "View interests"
ON public.shared_rental_interests
FOR SELECT
USING (
  auth.uid() = interested_student_id 
  OR EXISTS (
    SELECT 1 FROM public.shared_rentals 
    WHERE id = shared_rental_id AND host_student_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Students can express interest
CREATE POLICY "Students can express interest"
ON public.shared_rental_interests
FOR INSERT
WITH CHECK (
  auth.uid() = interested_student_id 
  AND has_role(auth.uid(), 'student'::user_role)
);

-- Students can remove their interest
CREATE POLICY "Students can remove interest"
ON public.shared_rental_interests
FOR DELETE
USING (auth.uid() = interested_student_id);

-- Create notification trigger for interest
CREATE OR REPLACE FUNCTION public.notify_host_on_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  host_id UUID;
  property_title TEXT;
BEGIN
  -- Get host student id and property title
  SELECT sr.host_student_id, p.title
  INTO host_id, property_title
  FROM public.shared_rentals sr
  JOIN public.properties p ON p.id = sr.property_id
  WHERE sr.id = NEW.shared_rental_id;
  
  -- Create notification for host
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (
    host_id, 
    'student', 
    'interest', 
    'New Interest in Your Shared Rental',
    'A student is interested in your shared rental listing for "' || property_title || '".',
    '/student/shared',
    false
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_shared_rental_interest
AFTER INSERT ON public.shared_rental_interests
FOR EACH ROW
EXECUTE FUNCTION public.notify_host_on_interest();
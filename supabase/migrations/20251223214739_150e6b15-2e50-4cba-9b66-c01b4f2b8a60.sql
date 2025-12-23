-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_role user_role,
ADD COLUMN IF NOT EXISTS link text;

-- Rename read to is_read for clarity (create new column, copy data, drop old)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
UPDATE public.notifications SET is_read = read WHERE is_read IS NULL;

-- Create function to notify admin on dispute submission
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (admin_record.user_id, 'admin', 'dispute', 'New Dispute Submitted', 'A student has submitted a new dispute that requires your attention.', '/admin/reports', false);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on booking
CREATE OR REPLACE FUNCTION public.notify_agent_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (NEW.agent_id, 'agent', 'booking', 'New Booking Request', 'A student has requested to book one of your properties.', '/agent/bookings', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on listing approval
CREATE OR REPLACE FUNCTION public.notify_agent_on_listing_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Notify the agent
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.agent_id, 'agent', 'listing', 'Listing Approved', 'Your property listing "' || NEW.title || '" has been approved!', '/agent/listings', false);
    
    -- Notify all students about new listing
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    SELECT ur.user_id, 'student', 'listing', 'New Listing Available', 'A new property is now available: ' || NEW.title, '/property/' || NEW.id, false
    FROM public.user_roles ur WHERE ur.role = 'student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on review
CREATE OR REPLACE FUNCTION public.notify_agent_on_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (NEW.agent_id, 'agent', 'review', 'New Review Received', 'A student has left a review for you.', '/agent/profile', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_report();

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_booking();

DROP TRIGGER IF EXISTS on_listing_approved ON public.properties;
CREATE TRIGGER on_listing_approved
  AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_listing_approval();

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_review();
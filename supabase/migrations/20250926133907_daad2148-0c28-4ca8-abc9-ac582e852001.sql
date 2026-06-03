-- Add follow-up tracking columns to confirmed_bookings table
ALTER TABLE public.confirmed_bookings 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_sequence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT[],
ADD COLUMN IF NOT EXISTS auto_follow_up_enabled BOOLEAN DEFAULT true;

-- Create function to calculate next follow-up date based on sequence
CREATE OR REPLACE FUNCTION public.calculate_next_follow_up_date(
  last_contact TIMESTAMP WITH TIME ZONE,
  current_sequence INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE current_sequence
    WHEN 0 THEN 
      -- First follow-up: 2 days later
      RETURN last_contact + INTERVAL '2 days';
    WHEN 1 THEN 
      -- Second follow-up: 7 days after last contact
      RETURN last_contact + INTERVAL '7 days';
    WHEN 2 THEN 
      -- Third follow-up: 2 weeks after last contact
      RETURN last_contact + INTERVAL '2 weeks';
    WHEN 3 THEN 
      -- Fourth follow-up: 2 weeks after previous follow-up
      RETURN last_contact + INTERVAL '2 weeks';
    WHEN 4 THEN 
      -- Fifth follow-up: 2 weeks after previous follow-up
      RETURN last_contact + INTERVAL '2 weeks';
    ELSE
      -- No more follow-ups after sequence 4 (5 total opportunities)
      RETURN NULL;
  END CASE;
END;
$$;

-- Create trigger to automatically set next follow-up date when last_contact_date is updated
CREATE OR REPLACE FUNCTION public.update_next_follow_up_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if auto_follow_up_enabled is true and we haven't reached max sequence
  IF NEW.auto_follow_up_enabled = true AND NEW.follow_up_sequence < 5 THEN
    NEW.next_follow_up_date = public.calculate_next_follow_up_date(
      NEW.last_contact_date, 
      NEW.follow_up_sequence
    );
  ELSE
    NEW.next_follow_up_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on confirmed_bookings
DROP TRIGGER IF EXISTS trigger_update_next_follow_up_date ON public.confirmed_bookings;
CREATE TRIGGER trigger_update_next_follow_up_date
  BEFORE UPDATE OF last_contact_date, follow_up_sequence, auto_follow_up_enabled
  ON public.confirmed_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_next_follow_up_date();

-- Update existing records to set initial next_follow_up_date
UPDATE public.confirmed_bookings 
SET next_follow_up_date = public.calculate_next_follow_up_date(last_contact_date, follow_up_sequence)
WHERE auto_follow_up_enabled = true AND follow_up_sequence < 5;
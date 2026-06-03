-- Fix security vulnerability in confirmed_bookings table
-- Remove the dangerous (closer_user_id IS NULL) condition that allows unauthorized access

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Closers can view assigned bookings" ON public.confirmed_bookings;

-- Create a secure replacement policy that only allows:
-- 1. Setters to view bookings they created 
-- 2. Closers to view bookings explicitly assigned to them
CREATE POLICY "Secure booking access for closers" 
ON public.confirmed_bookings 
FOR SELECT 
USING (auth.uid() = closer_user_id);

-- The existing policy for setters remains secure:
-- "Setters can view bookings they created" with (auth.uid() = setter_user_id)

-- Update the existing update policy to be more explicit about security
DROP POLICY IF EXISTS "Users can update bookings they're involved with" ON public.confirmed_bookings;

CREATE POLICY "Secure booking updates" 
ON public.confirmed_bookings 
FOR UPDATE 
USING ((auth.uid() = setter_user_id) OR (auth.uid() = closer_user_id));

-- Add a comment explaining the security fix
COMMENT ON POLICY "Secure booking access for closers" ON public.confirmed_bookings IS 
'Security fix: Removes vulnerable (closer_user_id IS NULL) condition that exposed customer data to unauthorized users';
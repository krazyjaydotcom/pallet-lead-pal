-- Add DELETE policy for confirmed_bookings table
-- Allow users to delete bookings they created (setters) or are assigned to (closers)
CREATE POLICY "Users can delete their own bookings" 
ON public.confirmed_bookings 
FOR DELETE 
USING ((auth.uid() = setter_user_id) OR (auth.uid() = closer_user_id));
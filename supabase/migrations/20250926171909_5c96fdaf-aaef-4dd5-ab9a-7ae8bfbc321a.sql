-- Fix confirmed_bookings status constraint to allow 'lost'
-- Drop existing CHECK constraint and recreate with the expanded allowed set
ALTER TABLE public.confirmed_bookings
  DROP CONSTRAINT IF EXISTS confirmed_bookings_status_check;

ALTER TABLE public.confirmed_bookings
  ADD CONSTRAINT confirmed_bookings_status_check
  CHECK (
    status IN (
      'pending',
      'contacted',
      'follow_up_scheduled',
      'ready_to_proceed',
      'closed',
      'not_interested',
      'lost'
    )
  );

-- Ensure default remains consistent
ALTER TABLE public.confirmed_bookings
  ALTER COLUMN status SET DEFAULT 'pending';
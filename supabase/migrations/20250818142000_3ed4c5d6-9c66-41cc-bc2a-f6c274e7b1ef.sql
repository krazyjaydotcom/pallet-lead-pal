-- Update existing prospects with 'new' status to 'none'
UPDATE public.prospects 
SET status = 'none' 
WHERE status = 'new';

-- Drop the existing check constraint
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- Create new check constraint with updated status values
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_status_check 
CHECK (status IN ('none', '1st contact', 'follow_up', 'training', 'confirmed', 'ghost'));
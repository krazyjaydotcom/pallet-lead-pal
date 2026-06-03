-- Add submitted_date column to distinguish from current date field
ALTER TABLE public.leads 
ADD COLUMN submitted_date DATE;
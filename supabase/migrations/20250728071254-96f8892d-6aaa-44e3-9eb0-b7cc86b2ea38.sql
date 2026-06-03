-- Add service_type column to leads table to distinguish between delivery and pickup
ALTER TABLE public.leads 
ADD COLUMN service_type TEXT DEFAULT 'delivery' CHECK (service_type IN ('delivery', 'pickup', 'both'));
-- Add LTV columns to leads table
ALTER TABLE public.leads 
ADD COLUMN ltv_pallets_per_month INTEGER,
ADD COLUMN ltv_pallet_type TEXT CHECK (ltv_pallet_type IN ('standard', 'custom')),
ADD COLUMN ltv_price_per_pallet DECIMAL(10,2),
ADD COLUMN ltv_not_sure BOOLEAN DEFAULT false;
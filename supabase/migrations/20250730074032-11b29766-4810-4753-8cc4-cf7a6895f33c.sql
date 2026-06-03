-- Create closer KPI entries table
CREATE TABLE public.closer_kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  units_sold INTEGER NOT NULL DEFAULT 0,
  calls_made INTEGER NOT NULL DEFAULT 0,
  clients_signed INTEGER NOT NULL DEFAULT 0,
  cash_collected DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client success manager KPI entries table
CREATE TABLE public.csm_kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  client_check_ins INTEGER NOT NULL DEFAULT 0,
  issues_resolved INTEGER NOT NULL DEFAULT 0,
  upsells_completed INTEGER NOT NULL DEFAULT 0,
  client_satisfaction_score DECIMAL(3,2), -- 0.00 to 5.00 scale
  retention_rate DECIMAL(5,2), -- percentage
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create closer config table
CREATE TABLE public.closer_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  closing_rate_target DECIMAL(5,2) NOT NULL DEFAULT 40.00, -- percentage
  daily_units_target INTEGER NOT NULL DEFAULT 10,
  daily_clients_target INTEGER NOT NULL DEFAULT 5,
  cash_per_call_target DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CSM config table
CREATE TABLE public.csm_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_check_ins_target INTEGER NOT NULL DEFAULT 15,
  daily_issues_target INTEGER NOT NULL DEFAULT 8,
  monthly_upsells_target INTEGER NOT NULL DEFAULT 5,
  satisfaction_target DECIMAL(3,2) NOT NULL DEFAULT 4.50,
  retention_target DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.closer_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csm_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csm_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for closer_kpi_entries
CREATE POLICY "Users can view their own closer KPI entries" 
ON public.closer_kpi_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own closer KPI entries" 
ON public.closer_kpi_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own closer KPI entries" 
ON public.closer_kpi_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own closer KPI entries" 
ON public.closer_kpi_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for csm_kpi_entries
CREATE POLICY "Users can view their own CSM KPI entries" 
ON public.csm_kpi_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CSM KPI entries" 
ON public.csm_kpi_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSM KPI entries" 
ON public.csm_kpi_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSM KPI entries" 
ON public.csm_kpi_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for closer_config
CREATE POLICY "Users can view their own closer config" 
ON public.closer_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own closer config" 
ON public.closer_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own closer config" 
ON public.closer_config 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for csm_config
CREATE POLICY "Users can view their own CSM config" 
ON public.csm_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CSM config" 
ON public.csm_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSM config" 
ON public.csm_config 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_closer_kpi_entries_updated_at
BEFORE UPDATE ON public.closer_kpi_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_csm_kpi_entries_updated_at
BEFORE UPDATE ON public.csm_kpi_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_closer_config_updated_at
BEFORE UPDATE ON public.closer_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_csm_config_updated_at
BEFORE UPDATE ON public.csm_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
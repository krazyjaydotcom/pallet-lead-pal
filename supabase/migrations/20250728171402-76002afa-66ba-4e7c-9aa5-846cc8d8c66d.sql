-- Create table for setter KPI entries
CREATE TABLE public.setter_kpi_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  touch_points INTEGER NOT NULL DEFAULT 0,
  calls_pitched INTEGER NOT NULL DEFAULT 0,
  calls_booked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create table for setter configuration/targets
CREATE TABLE public.setter_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_touch_points_target INTEGER NOT NULL DEFAULT 100,
  pitch_to_book_ratio_target NUMERIC NOT NULL DEFAULT 0.50,
  daily_calls_booked_target INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.setter_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setter_config ENABLE ROW LEVEL SECURITY;

-- Create policies for setter_kpi_entries
CREATE POLICY "Users can view their own KPI entries" 
ON public.setter_kpi_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own KPI entries" 
ON public.setter_kpi_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KPI entries" 
ON public.setter_kpi_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own KPI entries" 
ON public.setter_kpi_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for setter_config
CREATE POLICY "Users can view their own config" 
ON public.setter_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own config" 
ON public.setter_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config" 
ON public.setter_config 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_setter_kpi_entries_updated_at
BEFORE UPDATE ON public.setter_kpi_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setter_config_updated_at
BEFORE UPDATE ON public.setter_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create table for KPI share tokens
CREATE TABLE public.kpi_share_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id UUID NOT NULL,
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('setter', 'closer', 'csm')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.kpi_share_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for kpi_share_tokens
CREATE POLICY "Users can view their own share tokens" 
ON public.kpi_share_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share tokens" 
ON public.kpi_share_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own share tokens" 
ON public.kpi_share_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share tokens" 
ON public.kpi_share_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kpi_share_tokens_updated_at
BEFORE UPDATE ON public.kpi_share_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for token lookups
CREATE INDEX idx_kpi_share_tokens_token ON public.kpi_share_tokens(token);
CREATE INDEX idx_kpi_share_tokens_expires_at ON public.kpi_share_tokens(expires_at);
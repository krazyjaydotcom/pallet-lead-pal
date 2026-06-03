-- Create a table for no-call/no-show tracking
CREATE TABLE public.no_call_no_shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.no_call_no_shows ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own no-call/no-shows" 
ON public.no_call_no_shows 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own no-call/no-shows" 
ON public.no_call_no_shows 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own no-call/no-shows" 
ON public.no_call_no_shows 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own no-call/no-shows" 
ON public.no_call_no_shows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_no_call_no_shows_updated_at
BEFORE UPDATE ON public.no_call_no_shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
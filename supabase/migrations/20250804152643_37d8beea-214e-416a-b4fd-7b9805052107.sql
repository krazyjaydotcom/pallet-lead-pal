-- Create prospects table for setter lead management
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  ig_handle TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'follow_up', 'training', 'confirmed', 'no_response', 'ghost')),
  follow_up_count INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_count >= 0 AND follow_up_count <= 5),
  notes TEXT,
  training_reminder_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own prospects" 
ON public.prospects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prospects" 
ON public.prospects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospects" 
ON public.prospects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospects" 
ON public.prospects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create confirmed_bookings table to pass leads to closers
CREATE TABLE public.confirmed_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  setter_user_id UUID NOT NULL,
  closer_user_id UUID,
  name TEXT NOT NULL,
  ig_handle TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'contacted', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for confirmed_bookings
ALTER TABLE public.confirmed_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for confirmed_bookings
CREATE POLICY "Setters can view bookings they created" 
ON public.confirmed_bookings 
FOR SELECT 
USING (auth.uid() = setter_user_id);

CREATE POLICY "Closers can view assigned bookings" 
ON public.confirmed_bookings 
FOR SELECT 
USING (auth.uid() = closer_user_id OR closer_user_id IS NULL);

CREATE POLICY "Setters can create bookings" 
ON public.confirmed_bookings 
FOR INSERT 
WITH CHECK (auth.uid() = setter_user_id);

CREATE POLICY "Users can update bookings they're involved with" 
ON public.confirmed_bookings 
FOR UPDATE 
USING (auth.uid() = setter_user_id OR auth.uid() = closer_user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_confirmed_bookings_updated_at
BEFORE UPDATE ON public.confirmed_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
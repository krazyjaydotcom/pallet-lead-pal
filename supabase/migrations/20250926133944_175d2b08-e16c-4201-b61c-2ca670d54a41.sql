-- Fix search_path security warnings for the functions I just created
CREATE OR REPLACE FUNCTION public.calculate_next_follow_up_date(
  last_contact TIMESTAMP WITH TIME ZONE,
  current_sequence INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE current_sequence
    WHEN 0 THEN 
      -- First follow-up: 2 days later
      RETURN last_contact + INTERVAL '2 days';
    WHEN 1 THEN 
      -- Second follow-up: 7 days after last contact
      RETURN last_contact + INTERVAL '7 days';
    WHEN 2 THEN 
      -- Third follow-up: 2 weeks after last contact
      RETURN last_contact + INTERVAL '2 weeks';
    WHEN 3 THEN 
      -- Fourth follow-up: 2 weeks after previous follow-up
      RETURN last_contact + INTERVAL '2 weeks';
    WHEN 4 THEN 
      -- Fifth follow-up: 2 weeks after previous follow-up
      RETURN last_contact + INTERVAL '2 weeks';
    ELSE
      -- No more follow-ups after sequence 4 (5 total opportunities)
      RETURN NULL;
  END CASE;
END;
$$;

-- Fix search_path security warning for the trigger function
CREATE OR REPLACE FUNCTION public.update_next_follow_up_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only update if auto_follow_up_enabled is true and we haven't reached max sequence
  IF NEW.auto_follow_up_enabled = true AND NEW.follow_up_sequence < 5 THEN
    NEW.next_follow_up_date = public.calculate_next_follow_up_date(
      NEW.last_contact_date, 
      NEW.follow_up_sequence
    );
  ELSE
    NEW.next_follow_up_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix search_path for existing functions that had warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_activity_to_setter_kpis()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tp int := 0;
  v_pitch int := 0;
  v_book int := 0;
BEGIN
  -- Only count the first touch event (touch_point or follow_up_increment) per prospect per day
  IF NEW.event_type IN ('touch_point', 'follow_up_increment') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.prospect_activity pa
      WHERE pa.user_id = NEW.user_id
        AND pa.prospect_id = NEW.prospect_id
        AND pa.event_date = NEW.event_date
        AND pa.event_type IN ('touch_point', 'follow_up_increment')
        AND pa.id <> NEW.id
    ) THEN
      v_tp := 1;
    END IF;
  ELSIF NEW.event_type = 'call_pitched' THEN
    -- Keep current behavior for pitched (can be adjusted later if needed)
    v_pitch := 1;
  ELSIF NEW.event_type = 'call_booked' THEN
    -- Keep current behavior for booked (can be adjusted later if needed)
    v_book := 1;
  END IF;

  IF v_tp > 0 OR v_pitch > 0 OR v_book > 0 THEN
    INSERT INTO public.setter_kpi_entries (user_id, date, touch_points, calls_pitched, calls_booked)
    VALUES (NEW.user_id, NEW.event_date, v_tp, v_pitch, v_book)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      touch_points = public.setter_kpi_entries.touch_points + EXCLUDED.touch_points,
      calls_pitched = public.setter_kpi_entries.calls_pitched + EXCLUDED.calls_pitched,
      calls_booked = public.setter_kpi_entries.calls_booked + EXCLUDED.calls_booked,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;
-- Enforce: a prospect can only contribute 1 touch point per day
-- Update the aggregator function to dedupe touch_points per prospect/day
CREATE OR REPLACE FUNCTION public.apply_activity_to_setter_kpis()
RETURNS trigger
LANGUAGE plpgsql
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

-- Ensure we can upsert on (user_id, date)
CREATE UNIQUE INDEX IF NOT EXISTS ux_setter_kpi_entries_user_date ON public.setter_kpi_entries(user_id, date);

-- Attach trigger to prospect_activity inserts
DROP TRIGGER IF EXISTS trg_apply_activity_to_setter_kpis ON public.prospect_activity;
CREATE TRIGGER trg_apply_activity_to_setter_kpis
AFTER INSERT ON public.prospect_activity
FOR EACH ROW
EXECUTE FUNCTION public.apply_activity_to_setter_kpis();
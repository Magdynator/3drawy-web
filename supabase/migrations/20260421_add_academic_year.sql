
-- Migration: Add academic year tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS starting_year INTEGER;

-- Function to calculate academic level based on starting year and current date
CREATE OR REPLACE FUNCTION public.calculate_academic_level(start_year INTEGER, current_ts TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    calc_level INTEGER;
BEGIN
    IF start_year IS NULL THEN
        RETURN NULL;
    END IF;

    current_year := EXTRACT(YEAR FROM current_ts);
    current_month := EXTRACT(MONTH FROM current_ts);

    -- Level = (Current Year - Start Year) + (1 if month >= September)
    calc_level := current_year - start_year;
    IF current_month >= 9 THEN
        calc_level := calc_level + 1;
    END IF;

    -- Return the calculated level (1, 2, 3, 4, or 5 for Graduate)
    -- If it's less than 1, we cap at 1. If it's > 5, it stays reflecting time passed.
    IF calc_level < 1 THEN
        calc_level := 1;
    END IF;
    
    RETURN calc_level;
END;
$$;

-- Allow authenticated users to use this function
GRANT EXECUTE ON FUNCTION public.calculate_academic_level(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_academic_level(INTEGER, TIMESTAMPTZ) TO service_role;

-- Update PostgREST schema cache
NOTIFY pgrst, 'reload schema';

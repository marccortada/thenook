-- Drop real_time_metrics table and related functions
DROP TABLE IF EXISTS public.real_time_metrics CASCADE;

-- Drop the calculate_real_time_metrics function
DROP FUNCTION IF EXISTS public.calculate_real_time_metrics() CASCADE;
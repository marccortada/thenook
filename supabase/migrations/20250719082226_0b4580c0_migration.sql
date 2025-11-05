-- Add RPC functions for happy hour management

-- Function to get all happy hours (admin only)
CREATE OR REPLACE FUNCTION get_happy_hours()
RETURNS SETOF happy_hours
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is admin
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT * FROM happy_hours
  ORDER BY created_at DESC;
END;
$$;

-- Function to create a new happy hour (admin only)
CREATE OR REPLACE FUNCTION create_happy_hour(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_time TIME DEFAULT '16:00',
  p_end_time TIME DEFAULT '18:00',
  p_discount_percentage INTEGER DEFAULT 30,
  p_days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  p_service_types TEXT[] DEFAULT ARRAY['massage'],
  p_applicable_centers UUID[] DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check if the user is admin
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  INSERT INTO happy_hours (
    name,
    description,
    start_time,
    end_time,
    discount_percentage,
    days_of_week,
    service_types,
    applicable_centers,
    is_active
  )
  VALUES (
    p_name,
    p_description,
    p_start_time,
    p_end_time,
    p_discount_percentage,
    p_days_of_week,
    p_service_types,
    p_applicable_centers,
    p_is_active
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to toggle happy hour active status (admin only)
CREATE OR REPLACE FUNCTION toggle_happy_hour(
  p_happy_hour_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is admin
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  UPDATE happy_hours
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_happy_hour_id;
END;
$$;

-- Function to delete a happy hour (admin only)
CREATE OR REPLACE FUNCTION delete_happy_hour(
  p_happy_hour_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is admin
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  DELETE FROM happy_hours
  WHERE id = p_happy_hour_id;
END;
$$;
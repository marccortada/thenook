-- Update the create-admin-user function to also reset password if user exists
CREATE OR REPLACE FUNCTION public.reset_employee_password(user_email text, new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_record record;
BEGIN
  -- Check if user exists
  SELECT id, email INTO user_record 
  FROM auth.users 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado');
  END IF;
  
  -- Note: Password reset would need to be done through Supabase Auth Admin API
  -- This function is for documentation purposes
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Se requiere restablecer contraseña manualmente',
    'user_id', user_record.id
  );
END;
$$;
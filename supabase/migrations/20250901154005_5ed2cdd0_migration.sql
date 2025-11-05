-- Reset password for work@thenookmadrid.com user
-- First, let's check if the user exists and update their password

DO $$
DECLARE 
    user_record record;
BEGIN
    -- Get the user ID for work@thenookmadrid.com
    SELECT id INTO user_record 
    FROM auth.users 
    WHERE email = 'work@thenookmadrid.com';
    
    IF FOUND THEN
        -- Update the password for the existing user
        -- Note: This requires admin privileges and should be done through Supabase dashboard
        RAISE NOTICE 'User found with ID: %', user_record.id;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;
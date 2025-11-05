-- Generar nuevo UUID para el usuario work
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Insertar en auth.users con nuevo ID
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
    VALUES 
      (new_user_id, 'work@thenookmadrid.com', crypt('worker1234', gen_salt('bf')), now(), now(), now(), '{"first_name": "Staff", "last_name": "Employee"}'::jsonb, 'authenticated', 'authenticated');
    
    -- Actualizar el perfil con el nuevo user_id
    UPDATE profiles SET user_id = new_user_id WHERE email = 'work@thenookmadrid.com';
    
    -- Log del nuevo ID
    RAISE NOTICE 'New user_id for work@thenookmadrid.com: %', new_user_id;
END $$;
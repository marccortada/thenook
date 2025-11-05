-- Crear usuario work@thenookmadrid.com y vincular con perfil existente
DO $$
DECLARE
    existing_profile_id UUID;
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Obtener el ID del perfil existente
    SELECT id INTO existing_profile_id FROM profiles WHERE email = 'work@thenookmadrid.com';
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        new_user_id,
        'work@thenookmadrid.com',
        crypt('worker1234', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"first_name": "Staff", "last_name": "Employee"}'::jsonb,
        'authenticated',
        'authenticated'
    );
    
    -- Actualizar el perfil con el user_id correcto
    UPDATE profiles 
    SET user_id = new_user_id
    WHERE id = existing_profile_id;
    
    RAISE NOTICE 'Usuario creado con ID: % y vinculado al perfil: %', new_user_id, existing_profile_id;
END $$;
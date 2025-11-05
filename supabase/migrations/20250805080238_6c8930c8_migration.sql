-- Crear usuario directamente en auth.users y actualizar perfil
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Insertar directamente en auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        aud,
        role,
        confirmation_token,
        confirmed_at
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'work@thenookmadrid.com',
        crypt('worker1234', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"first_name": "Staff", "last_name": "Employee"}'::jsonb,
        'authenticated',
        'authenticated',
        '',
        now()
    );
    
    -- Actualizar el perfil existente
    UPDATE profiles 
    SET user_id = new_user_id
    WHERE email = 'work@thenookmadrid.com';
    
    RAISE NOTICE 'Usuario % creado e integrado con perfil exitosamente', new_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;
-- Solución directa: crear usuario sin trigger y actualizar perfil existente
DO $$
DECLARE
    existing_profile_id UUID;
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Obtener el ID del perfil existente
    SELECT id INTO existing_profile_id FROM profiles WHERE email = 'work@thenookmadrid.com';
    
    -- Deshabilitar trigger temporalmente
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    
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
    
    -- Volver a habilitar trigger
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    
    -- Actualizar el perfil existente con el user_id correcto
    UPDATE profiles 
    SET user_id = new_user_id
    WHERE id = existing_profile_id;
    
    RAISE NOTICE 'Usuario creado con ID: % y vinculado al perfil: %', new_user_id, existing_profile_id;
END $$;
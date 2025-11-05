-- Deshabilitar trigger temporalmente
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Crear usuario work@thenookmadrid.com
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
VALUES 
  ('78b1bf03-374e-41f4-9bcb-0801620118bd', 'work@thenookmadrid.com', crypt('worker1234', gen_salt('bf')), now(), now(), now(), '{"first_name": "Staff", "last_name": "Employee"}'::jsonb, 'authenticated', 'authenticated');

-- Volver a habilitar trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Actualizar el perfil para que tenga user_id correcto
UPDATE profiles SET user_id = '78b1bf03-374e-41f4-9bcb-0801620118bd' WHERE email = 'work@thenookmadrid.com';
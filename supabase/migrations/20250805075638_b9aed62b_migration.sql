-- Crear usuarios de autenticación directamente
DELETE FROM auth.users WHERE email IN ('admin@thenookmadrid.com', 'work@thenookmadrid.com');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
VALUES 
  ('b72c1b2a-854d-4aa1-812a-4f0edc2c4f3d', 'admin@thenookmadrid.com', crypt('Gnerai123', gen_salt('bf')), now(), now(), now(), '{"first_name": "administración", "last_name": "Madrid"}'::jsonb, 'authenticated', 'authenticated'),
  ('78b1bf03-374e-41f4-9bcb-0801620118bd', 'work@thenookmadrid.com', crypt('worker1234', gen_salt('bf')), now(), now(), now(), '{"first_name": "Staff", "last_name": "Employee"}'::jsonb, 'authenticated', 'authenticated');

-- Actualizar perfiles para que tengan user_id correcto
UPDATE profiles SET user_id = 'b72c1b2a-854d-4aa1-812a-4f0edc2c4f3d' WHERE email = 'admin@thenookmadrid.com';
UPDATE profiles SET user_id = '78b1bf03-374e-41f4-9bcb-0801620118bd' WHERE email = 'work@thenookmadrid.com';
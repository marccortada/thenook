-- Usar la función de Supabase para crear el usuario
SELECT auth.signup(
  email => 'work@thenookmadrid.com',
  password => 'worker1234',
  user_metadata => '{"first_name": "Staff", "last_name": "Employee"}'::jsonb
) as user_creation_result;
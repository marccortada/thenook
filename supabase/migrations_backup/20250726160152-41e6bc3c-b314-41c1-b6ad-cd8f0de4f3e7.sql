-- Fix RLS policy for profiles table to allow users to read their own profile
DROP POLICY IF EXISTS "Secure profile viewing" ON public.profiles;

-- Create a new policy that allows users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Also allow admins and employees to view all profiles (keep existing functionality)
CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Make sure the handle_new_user function can still insert profiles
DROP POLICY IF EXISTS "Secure admin profile creation" ON public.profiles;

CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);
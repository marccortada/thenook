-- Ensure pgcrypto is installed in the extensions schema (not public)
create extension if not exists pgcrypto with schema extensions;
-- If it was created in public previously, move it
alter extension pgcrypto set schema extensions;

-- Recreate updated_at function with secure search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

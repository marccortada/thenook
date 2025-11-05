-- Create extension for UUID generation
create extension if not exists pgcrypto;

-- Create table for Happy Hours
create table if not exists public.happy_hours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_time time without time zone not null,
  end_time time without time zone not null,
  discount_percentage integer not null check (discount_percentage >= 1 and discount_percentage <= 100),
  days_of_week smallint[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.happy_hours enable row level security;

-- Policies: allow authenticated users to manage happy hours
create policy if not exists "Authenticated users can read happy hours"
  on public.happy_hours for select
  using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can insert happy hours"
  on public.happy_hours for insert
  with check (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can update happy hours"
  on public.happy_hours for update
  using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can delete happy hours"
  on public.happy_hours for delete
  using (auth.role() = 'authenticated');

-- Function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create or replace trigger set_happy_hours_updated_at
before update on public.happy_hours
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_happy_hours_active on public.happy_hours (is_active);

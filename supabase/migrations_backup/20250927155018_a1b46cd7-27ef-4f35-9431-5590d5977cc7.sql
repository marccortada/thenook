-- Add employee_codes field to employees table
ALTER TABLE public.employees 
ADD COLUMN employee_codes text[] DEFAULT '{}';

-- Add index for better performance when filtering by codes
CREATE INDEX idx_employees_codes ON public.employees USING GIN(employee_codes);
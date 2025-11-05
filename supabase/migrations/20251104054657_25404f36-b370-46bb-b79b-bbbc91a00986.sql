-- Ensure no default value exists on organization_id column
ALTER TABLE public.shifts 
ALTER COLUMN organization_id DROP DEFAULT;
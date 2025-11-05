-- Make is_admin column nullable in workers table
ALTER TABLE public.workers ALTER COLUMN is_admin DROP NOT NULL;
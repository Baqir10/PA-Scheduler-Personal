-- Rename is_admin to is_org in profiles table
ALTER TABLE public.profiles RENAME COLUMN is_admin TO is_org;

-- Add is_admin column to workers table
ALTER TABLE public.workers ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
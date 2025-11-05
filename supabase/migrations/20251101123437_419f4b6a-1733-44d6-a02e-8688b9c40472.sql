-- Add is_full_time column to workers table
ALTER TABLE public.workers
ADD COLUMN is_full_time BOOLEAN NOT NULL DEFAULT true;
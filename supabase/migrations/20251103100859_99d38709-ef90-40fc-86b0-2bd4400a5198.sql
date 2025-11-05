-- Add unavailable_days column to workers table
ALTER TABLE public.workers ADD COLUMN unavailable_days TEXT[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX idx_workers_unavailable_days ON public.workers USING GIN(unavailable_days);
-- Add color column to shifts table
ALTER TABLE public.shifts 
ADD COLUMN color text NOT NULL DEFAULT '#FFFFFF';
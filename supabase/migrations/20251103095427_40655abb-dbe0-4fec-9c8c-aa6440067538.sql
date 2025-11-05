-- Remove color column from shifts table
ALTER TABLE public.shifts DROP COLUMN IF EXISTS color;
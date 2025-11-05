-- Add worker_ids column to clinics table
ALTER TABLE public.clinics
ADD COLUMN worker_ids uuid[] DEFAULT '{}';

-- Drop existing worker policies on clinics table
DROP POLICY IF EXISTS "Workers can view their organization clinics" ON public.clinics;

-- Create new policies allowing workers to insert, update, delete clinics
CREATE POLICY "Workers can view their organization clinics"
ON public.clinics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = auth.uid()
    AND workers.organization_id = clinics.organization_id
  )
);

CREATE POLICY "Workers can insert clinics in their organization"
ON public.clinics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = auth.uid()
    AND workers.organization_id = clinics.organization_id
  )
);

CREATE POLICY "Workers can update clinics in their organization"
ON public.clinics
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = auth.uid()
    AND workers.organization_id = clinics.organization_id
  )
);

CREATE POLICY "Workers can delete clinics in their organization"
ON public.clinics
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = auth.uid()
    AND workers.organization_id = clinics.organization_id
  )
);
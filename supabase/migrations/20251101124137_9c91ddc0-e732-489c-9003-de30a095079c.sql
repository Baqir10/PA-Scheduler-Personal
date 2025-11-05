-- Add RLS policy to allow organizations to view their workers' profiles
CREATE POLICY "Organizations can view their workers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = profiles.id
    AND workers.organization_id = auth.uid()
  )
);
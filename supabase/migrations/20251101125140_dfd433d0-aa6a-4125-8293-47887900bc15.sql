-- Create clinics table
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clinics
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Organizations can manage their own clinics
CREATE POLICY "Organizations can insert their own clinics"
ON public.clinics
FOR INSERT
WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Organizations can view their own clinics"
ON public.clinics
FOR SELECT
USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can update their own clinics"
ON public.clinics
FOR UPDATE
USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can delete their own clinics"
ON public.clinics
FOR DELETE
USING (auth.uid() = organization_id);

-- Workers can view clinics from their organization
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

-- Add org_clinics column to organizations table
ALTER TABLE public.organizations
ADD COLUMN org_clinics UUID[] DEFAULT '{}';

-- Add worker_clinics column to workers table
ALTER TABLE public.workers
ADD COLUMN worker_clinics UUID[] DEFAULT '{}';

-- Add trigger for updated_at on clinics
CREATE TRIGGER update_clinics_updated_at
BEFORE UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
-- Add organization_id column to shifts table
ALTER TABLE public.shifts 
ADD COLUMN organization_id UUID NOT NULL 
REFERENCES public.organizations(id) ON DELETE CASCADE
DEFAULT 'b05020a5-3b62-4e99-9d6a-322fa91fcee2';

-- Remove the default after setting existing rows
ALTER TABLE public.shifts 
ALTER COLUMN organization_id DROP DEFAULT;

-- Add index for better query performance
CREATE INDEX idx_shifts_organization_id ON public.shifts(organization_id);
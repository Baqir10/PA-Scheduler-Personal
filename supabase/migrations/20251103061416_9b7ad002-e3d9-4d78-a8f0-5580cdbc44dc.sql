-- Create shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_name TEXT NOT NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Organizations can view shifts for their clinics
CREATE POLICY "Organizations can view their clinic shifts"
ON public.shifts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE clinics.id = shifts.clinic_id
    AND clinics.organization_id = auth.uid()
  )
);

-- Organizations can insert shifts for their clinics
CREATE POLICY "Organizations can insert their clinic shifts"
ON public.shifts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE clinics.id = shifts.clinic_id
    AND clinics.organization_id = auth.uid()
  )
);

-- Organizations can update shifts for their clinics
CREATE POLICY "Organizations can update their clinic shifts"
ON public.shifts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE clinics.id = shifts.clinic_id
    AND clinics.organization_id = auth.uid()
  )
);

-- Organizations can delete shifts for their clinics
CREATE POLICY "Organizations can delete their clinic shifts"
ON public.shifts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE clinics.id = shifts.clinic_id
    AND clinics.organization_id = auth.uid()
  )
);

-- Workers can view shifts for their organization's clinics
CREATE POLICY "Workers can view their organization clinic shifts"
ON public.shifts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    JOIN public.workers ON workers.organization_id = clinics.organization_id
    WHERE clinics.id = shifts.clinic_id
    AND workers.id = auth.uid()
  )
);

-- Admin workers can insert shifts for their organization's clinics
CREATE POLICY "Admin workers can insert their organization clinic shifts"
ON public.shifts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics
    JOIN public.workers ON workers.organization_id = clinics.organization_id
    WHERE clinics.id = shifts.clinic_id
    AND workers.id = auth.uid()
    AND workers.is_admin = true
  )
);

-- Admin workers can update shifts for their organization's clinics
CREATE POLICY "Admin workers can update their organization clinic shifts"
ON public.shifts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    JOIN public.workers ON workers.organization_id = clinics.organization_id
    WHERE clinics.id = shifts.clinic_id
    AND workers.id = auth.uid()
    AND workers.is_admin = true
  )
);

-- Admin workers can delete shifts for their organization's clinics
CREATE POLICY "Admin workers can delete their organization clinic shifts"
ON public.shifts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clinics
    JOIN public.workers ON workers.organization_id = clinics.organization_id
    WHERE clinics.id = shifts.clinic_id
    AND workers.id = auth.uid()
    AND workers.is_admin = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
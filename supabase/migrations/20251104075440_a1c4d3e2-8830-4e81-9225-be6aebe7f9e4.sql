-- Create shifts_and_workers table
CREATE TABLE public.shifts_and_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shift_id, date)
);

-- Enable RLS
ALTER TABLE public.shifts_and_workers ENABLE ROW LEVEL SECURITY;

-- Organizations can manage their shift assignments
CREATE POLICY "Organizations can view their shift assignments"
ON public.shifts_and_workers
FOR SELECT
USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can insert their shift assignments"
ON public.shifts_and_workers
FOR INSERT
WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Organizations can update their shift assignments"
ON public.shifts_and_workers
FOR UPDATE
USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can delete their shift assignments"
ON public.shifts_and_workers
FOR DELETE
USING (auth.uid() = organization_id);

-- Workers can view their own shift assignments
CREATE POLICY "Workers can view their shift assignments"
ON public.shifts_and_workers
FOR SELECT
USING (auth.uid() = worker_id OR EXISTS (
  SELECT 1 FROM workers
  WHERE workers.id = auth.uid()
  AND workers.organization_id = shifts_and_workers.organization_id
));

-- Create index for better performance
CREATE INDEX idx_shifts_and_workers_date ON public.shifts_and_workers(date);
CREATE INDEX idx_shifts_and_workers_worker ON public.shifts_and_workers(worker_id);
CREATE INDEX idx_shifts_and_workers_org ON public.shifts_and_workers(organization_id);
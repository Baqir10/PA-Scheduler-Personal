-- Drop old policies first
DROP POLICY IF EXISTS "Workers can create requests" ON public.worker_requests;
DROP POLICY IF EXISTS "Workers can read their own requests" ON public.worker_requests;
DROP POLICY IF EXISTS "Organizations can read their requests" ON public.worker_requests;
DROP POLICY IF EXISTS "Organizations can update their requests" ON public.worker_requests;

-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Organizations can read their own data"
  ON public.organizations
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Organizations can update their own data"
  ON public.organizations
  FOR UPDATE
  USING (auth.uid() = id);

-- Rename worker_requests to workers and modify structure
ALTER TABLE public.worker_requests RENAME TO workers;

-- Remove worker_id column
ALTER TABLE public.workers DROP COLUMN worker_id;

-- Add id as primary key (using existing id column or creating new one)
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS worker_requests_pkey;
ALTER TABLE public.workers ADD COLUMN new_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workers DROP COLUMN id;
ALTER TABLE public.workers RENAME COLUMN new_id TO id;
ALTER TABLE public.workers ADD PRIMARY KEY (id);

-- Add first_name and last_name
ALTER TABLE public.workers ADD COLUMN first_name text NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN last_name text NOT NULL DEFAULT '';

-- Change organization_id to reference the organizations table
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS worker_requests_organization_id_fkey;
ALTER TABLE public.workers ADD CONSTRAINT workers_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create new RLS policies for workers
CREATE POLICY "Workers can read their own data"
  ON public.workers
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Workers can insert their own data"
  ON public.workers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Workers can update their own data"
  ON public.workers
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Organizations can read their workers"
  ON public.workers
  FOR SELECT
  USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can update their workers"
  ON public.workers
  FOR UPDATE
  USING (auth.uid() = organization_id);

-- Add trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update handle_new_user function to insert into organizations table for org users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, is_organization)
  VALUES (
    new.id,
    new.email,
    COALESCE((new.raw_user_meta_data->>'is_organization')::boolean, false)
  );

  -- If organization, insert into organizations table
  IF COALESCE((new.raw_user_meta_data->>'is_organization')::boolean, false) THEN
    INSERT INTO public.organizations (id, email, name)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'organization_name', '')
    );
  END IF;

  RETURN new;
END;
$$;
-- Create profiles table to store user information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_organization boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create worker_requests table for organization approval workflow
CREATE TABLE public.worker_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.worker_requests ENABLE ROW LEVEL SECURITY;

-- Workers can read their own requests
CREATE POLICY "Workers can read their own requests"
  ON public.worker_requests
  FOR SELECT
  USING (auth.uid() = worker_id);

-- Organizations can read requests for them
CREATE POLICY "Organizations can read their requests"
  ON public.worker_requests
  FOR SELECT
  USING (auth.uid() = organization_id);

-- Workers can create requests
CREATE POLICY "Workers can create requests"
  ON public.worker_requests
  FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

-- Organizations can update their requests (approve/reject)
CREATE POLICY "Organizations can update their requests"
  ON public.worker_requests
  FOR UPDATE
  USING (auth.uid() = organization_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_organization)
  VALUES (
    new.id,
    new.email,
    COALESCE((new.raw_user_meta_data->>'is_organization')::boolean, false)
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_worker_requests_updated_at
  BEFORE UPDATE ON public.worker_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();